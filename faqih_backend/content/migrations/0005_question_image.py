from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0004_question_type_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='image_data',
            field=models.BinaryField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='question',
            name='image_mime',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
