from django.contrib import admin

from .models import Exam, ExamSchedule, ExamSubject, ExamTerm, GradeRule, GradeScale, MarkEntry, Result, ResultSubject, Transcript

admin.site.register(Exam)
admin.site.register(ExamSchedule)
admin.site.register(ExamSubject)
admin.site.register(ExamTerm)
admin.site.register(GradeRule)
admin.site.register(GradeScale)
admin.site.register(MarkEntry)
admin.site.register(Result)
admin.site.register(ResultSubject)
admin.site.register(Transcript)
