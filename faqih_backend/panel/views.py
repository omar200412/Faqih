import json

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from content.models import Category, Exercise, Lesson, Unit

MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB

# Panelde desteklenen soru türleri
ENABLED_TYPES = {
    'mcq':        {'label': 'Çoktan Seçmeli', 'glyph': 'A·B', 'desc': '4 seçenek, tek doğru cevap'},
    'true_false': {'label': 'Doğru / Yanlış', 'glyph': '✓✗',  'desc': 'Hızlı bilgi kontrolü'},
    'matching':   {'label': 'Eşleştirme',     'glyph': '⇄',   'desc': 'Terimleri anlamlarıyla eşleştir'},
    'image':      {'label': 'Resimli Soru',   'glyph': '▣',   'desc': 'Görsel üzerinden soru sor'},
    'video':      {'label': 'Video Ders',     'glyph': '▶',   'desc': 'YouTube bağlantısı ile'},
    'ordering':   {'label': 'Sıralama',       'glyph': '1·2', 'desc': 'Adımları doğru sıraya diz'},
    'fill_blank': {'label': 'Boşluk Doldurma', 'glyph': '_·_', 'desc': 'Cümledeki boşluğu kelime havuzundan doldur'},
}
TYPE_LABELS = {
    'mcq': 'Çoktan Seçmeli',
    'multiple_choice': 'Çoktan Seçmeli',
    'true_false': 'Doğru / Yanlış',
    'matching': 'Eşleştirme',
    'image': 'Resimli Soru',
    'video': 'Video Ders',
    'ordering': 'Sıralama',
    'fill_blank': 'Boşluk Doldurma',
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
            if o.get('id') == question.correct_answer:
                return o.get('text') or question.correct_answer
    return question.correct_answer


def _pairs(question):
    data = _parsed_options(question)
    if isinstance(data, dict) and isinstance(data.get('pairs'), list):
        return [list(p) for p in data['pairs'] if isinstance(p, (list, tuple)) and len(p) == 2]
    return []


def _ordering_steps(question):
    data = _parsed_options(question)
    if isinstance(data, dict) and isinstance(data.get('steps'), list):
        return [str(s) for s in data['steps']]
    return []


def _fill_blank_parts(question):
    data = _parsed_options(question)
    if isinstance(data, dict):
        return data.get('sentence', ''), [str(w) for w in data.get('word_bank', [])]
    return '', []


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
        hint = 'Doğru cevap: ' + (question.correct_answer or '—')
    elif qtype == 'matching':
        hint = '%d eşleştirme çifti' % len(_pairs(question))
    elif qtype == 'video':
        hint = _video_url(question) or 'Bağlantı yok'
    elif qtype == 'ordering':
        hint = '%d adım' % len(_ordering_steps(question))
    elif qtype == 'fill_blank':
        hint = 'Doğru kelime: ' + (question.correct_answer or '—')
    else:
        hint = TYPE_LABELS.get(qtype, qtype)
    return {
        'obj': question,
        'qtype': qtype,
        'type_label': TYPE_LABELS.get(qtype, qtype),
        'hint': hint,
        'editable': qtype in ENABLED_TYPES,
    }


def _sidebar_context(selected_unit=None, selected_lesson=None):
    return {
        'categories': Category.objects.prefetch_related('units__lessons__exercises'),
        'selected_unit': selected_unit,
        'selected_lesson': selected_lesson,
    }


@staff_member_required
def home(request):
    unit = Unit.objects.first()
    if unit:
        return redirect('panel:unit', unit.id)
    ctx = _sidebar_context()
    ctx['unit'] = None
    ctx['lessons'] = []
    return render(request, 'panel/unit.html', ctx)


@staff_member_required
def unit_detail(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    ctx = _sidebar_context(unit)
    ctx['unit'] = unit
    ctx['lessons'] = unit.lessons.all()
    return render(request, 'panel/unit.html', ctx)


@staff_member_required
def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    ctx = _sidebar_context(lesson.unit, lesson)
    ctx['unit'] = lesson.unit
    ctx['lesson'] = lesson
    ctx['rows'] = [_row(e) for e in lesson.exercises.all()]
    return render(request, 'panel/lesson.html', ctx)


@staff_member_required
def type_picker(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    ctx = _sidebar_context(lesson.unit, lesson)
    ctx['unit'] = lesson.unit
    ctx['lesson'] = lesson
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


def _save_question(request, lesson, qtype, question=None):
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

    elif qtype == 'ordering':
        steps = [(s or '').strip() for s in request.POST.getlist('step')]
        steps = [s for s in steps if s]
        if len(steps) < 2:
            errors.append('En az 2 adım gerekli.')
        options_json = json.dumps({'steps': steps}, ensure_ascii=False)
        correct = ''

    elif qtype == 'fill_blank':
        sentence = (request.POST.get('sentence') or '').strip()
        word_bank = [(w or '').strip() for w in request.POST.getlist('word')]
        word_bank = [w for w in word_bank if w]
        correct = (request.POST.get('fb_correct') or '').strip()
        if '___' not in sentence:
            errors.append('Cümlede boşluk için ___ kullan.')
        if len(word_bank) < 2:
            errors.append('En az 2 kelime gerekli (doğrusu dahil).')
        if correct and correct not in word_bank:
            errors.append('Doğru kelime, kelime havuzunda olmalı.')
        if not correct:
            errors.append('Doğru kelimeyi seç.')
        options_json = json.dumps({'sentence': sentence, 'word_bank': word_bank}, ensure_ascii=False)

    if errors:
        return errors

    if question is None:
        question = Exercise(lesson=lesson, question_type=qtype)
    question.text = text
    question.options_json = options_json
    question.correct_answer = correct
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
        'steps': [s for s in request.POST.getlist('step') if s],
        'sentence': request.POST.get('sentence', ''),
        'word_bank': [w for w in request.POST.getlist('word') if w],
        'fb_correct': request.POST.get('fb_correct', ''),
    }


def _initial_from_question(question, qtype):
    opts = (_option_texts(question) + ['', '', '', ''])[:4]
    correct_text = _correct_text(question)
    if qtype in ('mcq', 'image'):
        correct = str(opts.index(correct_text)) if correct_text in opts else ''
    else:
        correct = question.correct_answer
    sentence, word_bank = _fill_blank_parts(question)
    return {
        'text': question.text,
        'explanation': question.explanation,
        'options': opts,
        'correct': correct,
        'pairs': _pairs(question),
        'url': _video_url(question),
        'steps': _ordering_steps(question),
        'sentence': sentence,
        'word_bank': word_bank,
        'fb_correct': question.correct_answer,
    }


@staff_member_required
def question_form(request, lesson_id=None, qtype=None, question_id=None):
    if question_id is not None:
        question = get_object_or_404(Exercise, pk=question_id)
        lesson = question.lesson
        qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    else:
        question = None
        lesson = get_object_or_404(Lesson, pk=lesson_id)

    if qtype not in ENABLED_TYPES:
        messages.error(request, 'Bu soru türü panelde henüz düzenlenemiyor.')
        return redirect('panel:lesson', lesson.id)

    errors = []
    if request.method == 'POST':
        errors = _save_question(request, lesson, qtype, question)
        if not errors:
            messages.success(request, 'Soru kaydedildi ✓' if question else 'Soru eklendi ✓')
            return redirect('panel:lesson', lesson.id)
        initial = _initial_from_post(request)
    elif question is not None:
        initial = _initial_from_question(question, qtype)
    else:
        initial = {'text': '', 'explanation': '', 'options': ['', '', '', ''],
                   'correct': '', 'pairs': [], 'url': '',
                   'steps': [], 'sentence': '', 'word_bank': [], 'fb_correct': ''}

    pairs = initial.get('pairs') or []
    while len(pairs) < 3:
        pairs.append(['', ''])

    steps = initial.get('steps') or []
    while len(steps) < 3:
        steps.append('')

    word_bank = initial.get('word_bank') or []
    while len(word_bank) < 4:
        word_bank.append('')

    ctx = _sidebar_context(lesson.unit, lesson)
    ctx.update({
        'unit': lesson.unit,
        'lesson': lesson,
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
        'step_rows': steps,
        'word_rows': word_bank,
        'has_image': bool(question and question.image_data),
    })
    return render(request, 'panel/question_form.html', ctx)


@staff_member_required
@require_POST
def question_delete(request, question_id):
    question = get_object_or_404(Exercise, pk=question_id)
    lesson_id = question.lesson_id
    question.delete()
    messages.success(request, 'Soru silindi.')
    return redirect('panel:lesson', lesson_id)


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


def _save_lesson(request, unit, lesson=None):
    errors = []
    title = (request.POST.get('title') or '').strip()
    if not title:
        errors.append('Ders adı boş olamaz.')

    intro_kind = request.POST.get('intro_kind', 'none')
    if intro_kind not in ('none', 'text', 'image', 'video'):
        intro_kind = 'none'

    intro_text = ''
    intro_video_url = ''
    upload = None

    if intro_kind == 'text':
        intro_text = (request.POST.get('intro_text') or '').strip()
        if not intro_text:
            errors.append('Giriş metni boş olamaz.')
    elif intro_kind == 'video':
        intro_video_url = (request.POST.get('intro_video_url') or '').strip()
        if not intro_video_url.startswith(('http://', 'https://')):
            errors.append('Geçerli bir video bağlantısı gir (https:// ile başlamalı).')
    elif intro_kind == 'image':
        upload = request.FILES.get('intro_image')
        if upload:
            if upload.size > MAX_IMAGE_BYTES:
                errors.append('Görsel en fazla 2 MB olabilir.')
            elif not (upload.content_type or '').startswith('image/'):
                errors.append('Sadece resim dosyası yüklenebilir (JPG/PNG).')
        elif lesson is None or not lesson.intro_image_data:
            errors.append('Bir görsel seç.')

    if errors:
        return errors, None

    if lesson is None:
        lesson = Lesson(unit=unit)
    lesson.title = title
    lesson.intro_kind = intro_kind
    lesson.intro_text = intro_text
    lesson.intro_video_url = intro_video_url
    if upload is not None:
        lesson.intro_image_data = upload.read()
        lesson.intro_image_mime = upload.content_type or 'image/jpeg'
    lesson.save()
    return [], lesson


@staff_member_required
def lesson_form(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    errors = []
    if request.method == 'POST':
        errors, lesson = _save_lesson(request, unit)
        if not errors:
            messages.success(request, 'Ders eklendi ✓')
            return redirect('panel:lesson', lesson.id)

    ctx = _sidebar_context(unit)
    ctx.update({'unit': unit, 'lesson': None, 'errors': errors})
    return render(request, 'panel/lesson_form.html', ctx)


@staff_member_required
def lesson_edit(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    errors = []
    if request.method == 'POST':
        errors, lesson = _save_lesson(request, lesson.unit, lesson)
        if not errors:
            messages.success(request, 'Ders kaydedildi ✓')
            return redirect('panel:lesson', lesson.id)

    ctx = _sidebar_context(lesson.unit, lesson)
    ctx.update({'unit': lesson.unit, 'lesson': lesson, 'errors': errors})
    return render(request, 'panel/lesson_form.html', ctx)


@staff_member_required
@require_POST
def lesson_delete(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    unit_id = lesson.unit_id
    lesson.delete()
    messages.success(request, 'Ders silindi.')
    return redirect('panel:unit', unit_id)
