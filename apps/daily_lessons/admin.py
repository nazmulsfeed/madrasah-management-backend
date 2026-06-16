from django.contrib import admin

from .models import DailyLessonReport, LessonReportAttachment

admin.site.register(DailyLessonReport)
admin.site.register(LessonReportAttachment)
