from django.contrib import admin

from .models import (
    Subject,
    Teacher,
    TeacherClassAssignment,
    TeacherDocument,
    TeacherEmployment,
    TeacherProfile,
    TeacherSubjectAssignment,
)

admin.site.register(Subject)
admin.site.register(Teacher)
admin.site.register(TeacherClassAssignment)
admin.site.register(TeacherDocument)
admin.site.register(TeacherEmployment)
admin.site.register(TeacherProfile)
admin.site.register(TeacherSubjectAssignment)
