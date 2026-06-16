from django.contrib import admin

from .models import (
    ClassLevel,
    Section,
    Student,
    StudentClassHistory,
    StudentDocument,
    StudentEnrollment,
    StudentMedicalInfo,
    StudentPreviousEducation,
    StudentProfile,
    StudentStatusHistory,
)

admin.site.register(ClassLevel)
admin.site.register(Section)
admin.site.register(Student)
admin.site.register(StudentClassHistory)
admin.site.register(StudentDocument)
admin.site.register(StudentEnrollment)
admin.site.register(StudentMedicalInfo)
admin.site.register(StudentPreviousEducation)
admin.site.register(StudentProfile)
admin.site.register(StudentStatusHistory)
