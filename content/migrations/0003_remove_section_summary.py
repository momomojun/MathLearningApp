from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0002_alter_section_content"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="section",
            name="summary",
        ),
    ]
