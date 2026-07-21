import json

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from content.models import Category, Question, Unit

MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB

# Panelde desteklenen soru türleri
ENABLED_TYPES = {
    'mcq':        {'label': 'Çoktan Seçmeli', 'glyph': 'A·B', 'desc': '4 seçenek, tek doğru cevap'},
    'true_false': {'label': 'Doğru / Yanlış', 'glyph': '✓✗',  'desc': 'Hızlı bilgi kontrolü'},
    'matching':   {'label': 'Eşleştirme',     'glyph': '⇄',   'desc': 'Terimleri anlamlarıyla eşleştir'},
    'image':      {'label': 'Resimli Soru',   'glyph': '▣',   'desc': 'Görsel üzerinden soru sor'},
    'video':      {'label': 'Video Ders',     'glyph': '▶',   'desc': 'YouTube bağlantısı ile'},
}
TYPE_LABELS = {
    'mcq': 'Çoktan Seçmeli',
    'multiple_choice': 'Çoktan Seçmeli',
    'true_false': 'Doğru / Yanlış',
    'matching': 'Eşleştirme',
    'image': 'Resimli Soru',
    'video': 'Video Ders',
    'hotspot': 'Hotspot',
}


def _parsed_options(question):
    try:
        return json.loads(question.options_json)
    except (TypeError, ValueError):
        return None


def _option_texts(question):
    """MCQ seçeneklerini düz metin listesi olarak döndürür (eski format dahil)."""
    data = _parsed_options(question)
    if isinstance(data, list):
        if data and isinstance(data[0], dict):
            return [o.get('text') or o.get('id', '') for o in data]
        return [str(o) for o in data]
    return []


def _correct_text(question):
    """Doğru cevabı metin olarak döndürür (eski id formatı dahil)."""
    data = _parsed_options(question)
    if isinstance(data, list) and data and isinstance(data[0], dict):
        for o in data:
            if o.get('id') == question.correct_option:
                return o.get('text') or question.correct_option
    return question.correct_option


def _pairs(question):
    data = _parsed_options(question)
    if isinstance(data, dict) and isinstance(data.get('pairs'), list):
        return [list(p) for p in data['pairs'] if isinstance(p, (list, tuple)) and len(p) == 2]
    return []


def _video_url(question):
    data = _parsed_options(question)
    if isinstance(data, dict):
        return data.get('url', '')
    return ''


def _row(question):
    qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    if qtype in ('mcq', 'image'):
        hint = 'Doğru: ' + (_correct_text(question) or '—')
    elif qtype == 'true_false':
        hint = 'Doğru cevap: ' + (question.correct_option or '—')
    elif qtype == 'matching':
        hint = '%d eşleştirme çifti' % len(_pairs(question))
    elif qtype == 'video':
        hint = _video_url(question) or 'Bağlantı yok'
    else:
        hint = TYPE_LABELS.get(qtype, qtype)
    return {
        'obj': question,
        'qtype': qtype,
        'type_label': TYPE_LABELS.get(qtype, qtype),
        'hint': hint,
        'editable': qtype in ENABLED_TYPES,
    }


def _sidebar_context(selected_unit=None):
    return {
        'categories': Category.objects.prefetch_related('units__questions'),
        'selected_unit': selected_unit,
    }


@staff_member_required
def home(request):
    unit = Unit.objects.first()
    if unit:
        return redirect('panel:unit', unit.id)
    ctx = _sidebar_context()
    ctx['rows'] = []
    ctx['unit'] = None
    return render(request, 'panel/unit.html', ctx)


@staff_member_required
def unit_detail(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    ctx = _sidebar_context(unit)
    ctx['unit'] = unit
    ctx['rows'] = [_row(q) for q in unit.questions.all()]
    return render(request, 'panel/unit.html', ctx)


@staff_member_required
def type_picker(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    ctx = _sidebar_context(unit)
    ctx['unit'] = unit
    ctx['enabled_types'] = [{'key': k, **v} for k, v in ENABLED_TYPES.items()]
    return render(request, 'panel/type_picker.html', ctx)


def _read_mcq_options(request, errors):
    """A-D seçeneklerini ve doğru işaretini okur; (options_json, correct) döndürür."""
    options = [(request.POST.get('opt%d' % i) or '').strip() for i in range(4)]
    filled = [o for o in options if o]
    if len(filled) < 2:
        errors.append('En az 2 seçenek doldurulmalı.')
    try:
        idx = int(request.POST.get('correct', ''))
    except (TypeError, ValueError):
        idx = -1
    if not (0 <= idx <= 3) or not options[idx]:
        errors.append('Doğru cevabı ✓ ile işaretle (boş seçenek olamaz).')
    if errors:
        return '', ''
    return json.dumps(filled, ensure_ascii=False), options[idx]


def _save_question(request, unit, qtype, question=None):
    """Formu doğrula ve kaydet. Hata varsa mesaj listesi döndürür."""
    errors = []
    text = (request.POST.get('text') or '').strip()
    explanation = (request.POST.get('explanation') or '').strip()
    if not text:
        errors.append('Video başlığı boş olamaz.' if qtype == 'video' else 'Soru metni boş olamaz.')

    options_json = ''
    correct = ''
    upload = None

    if qtype == 'mcq':
        options_json, correct = _read_mcq_options(request, errors)

    elif qtype == 'true_false':
        correct = request.POST.get('correct', '')
        if correct not in ('Doğru', 'Yanlış'):
            errors.append('Doğru cevabı seç: Doğru mu, Yanlış mı?')
        options_json = json.dumps(['Doğru', 'Yanlış'], ensure_ascii=False)

    elif qtype == 'matching':
        pairs = []
        for left, right in zip(request.POST.getlist('pl'), request.POST.getlist('pr')):
            left, right = left.strip(), right.strip()
            if left and right:
                pairs.append([left, right])
            elif left or right:
                errors.append('Her çiftin iki tarafı da dolu olmalı.')
                break
        if not errors and len(pairs) < 2:
            errors.append('En az 2 eşleştirme çifti gerekli.')
        options_json = json.dumps({'pairs': pairs}, ensure_ascii=False)

    elif qtype == 'image':
        options_json, correct = _read_mcq_options(request, errors)
        upload = request.FILES.get('image')
        if upload:
            if upload.size > MAX_IMAGE_BYTES:
                errors.append('Görsel en fazla 2 MB olabilir.')
            elif not (upload.content_type or '').startswith('image/'):
                errors.append('Sadece resim dosyası yüklenebilir (JPG/PNG).')
        elif question is None or not question.image_data:
            errors.append('Bir görsel seç.')

    elif qtype == 'video':
        url = (request.POST.get('url') or '').strip()
        if not url.startswith(('http://', 'https://')):
            errors.append('Geçerli bir video bağlantısı gir (https:// ile başlamalı).')
        options_json = json.dumps({'url': url}, ensure_ascii=False)

    if errors:
        return errors

    if question is None:
        question = Question(unit=unit, question_type=qtype)
    question.text = text
    question.options_json = options_json
    question.correct_option = correct
    question.explanation = explanation
    if upload is not None:
        question.image_data = upload.read()
        question.image_mime = upload.content_type or 'image/jpeg'
    question.save()
    return []


def _initial_from_post(request):
    return {
        'text': request.POST.get('text', ''),
        'explanation': request.POST.get('explanation', ''),
        'options': [(request.POST.get('opt%d' % i) or '') for i in range(4)],
        'correct': request.POST.get('correct', ''),
        'pairs': [list(p) for p in zip(request.POST.getlist('pl'), request.POST.getlist('pr'))],
        'url': request.POST.get('url', ''),
    }


def _initial_from_question(question, qtype):
    opts = (_option_texts(question) + ['', '', '', ''])[:4]
    correct_text = _correct_text(question)
    if qtype in ('mcq', 'image'):
        correct = str(opts.index(correct_text)) if correct_text in opts else ''
    else:
        correct = question.correct_option
    return {
        'text': question.text,
        'explanation': question.explanation,
        'options': opts,
        'correct': correct,
        'pairs': _pairs(question),
        'url': _video_url(question),
    }


@staff_member_required
def question_form(request, unit_id=None, qtype=None, question_id=None):
    if question_id is not None:
        question = get_object_or_404(Question, pk=question_id)
        unit = question.unit
        qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    else:
        question = None
        unit = get_object_or_404(Unit, pk=unit_id)

    if qtype not in ENABLED_TYPES:
        messages.error(request, 'Bu soru türü panelde henüz düzenlenemiyor.')
        return redirect('panel:unit', unit.id)

    errors = []
    if request.method == 'POST':
        errors = _save_question(request, unit, qtype, question)
        if not errors:
            messages.success(request, 'Soru kaydedildi ✓' if question else 'Soru eklendi ✓')
            return redirect('panel:unit', unit.id)
        initial = _initial_from_post(request)
    elif question is not None:
        initial = _initial_from_question(question, qtype)
    else:
        initial = {'text': '', 'explanation': '', 'options': ['', '', '', ''],
                   'correct': '', 'pairs': [], 'url': ''}

    pairs = initial.get('pairs') or []
    while len(pairs) < 3:
        pairs.append(['', ''])

    ctx = _sidebar_context(unit)
    ctx.update({
        'unit': unit,
        'question': question,
        'qtype': qtype,
        'type_label': ENABLED_TYPES[qtype]['label'],
        'initial': initial,
        'errors': errors,
        'option_rows': [
            {'i': i, 'letter': 'ABCD'[i], 'value': initial['options'][i]}
            for i in range(4)
        ],
        'pair_rows': pairs,
        'has_image': bool(question and question.image_data),
    })
    return render(request, 'panel/question_form.html', ctx)


@staff_member_required
@require_POST
def question_delete(request, question_id):
    question = get_object_or_404(Question, pk=question_id)
    unit_id = question.unit_id
    question.delete()
    messages.success(request, 'Soru silindi.')
    return redirect('panel:unit', unit_id)


@staff_member_required
@require_POST
def add_category(request):
    title = (request.POST.get('title') or '').strip()
    if not title:
        messages.error(request, 'Kategori adı boş olamaz.')
        return redirect('panel:home')
    category = Category.objects.create(title=title)
    unit = Unit.objects.create(category=category, title='Yeni Ünite')
    messages.success(request, 'Kategori eklendi.')
    return redirect('panel:unit', unit.id)


@staff_member_required
@require_POST
def add_unit(request):
    category = get_object_or_404(Category, pk=request.POST.get('category_id'))
    title = (request.POST.get('title') or '').strip()
    if not title:
        messages.error(request, 'Ünite adı boş olamaz.')
        return redirect('panel:home')
    unit = Unit.objects.create(category=category, title=title)
    messages.success(request, 'Ünite eklendi.')
    return redirect('panel:unit', unit.id)
