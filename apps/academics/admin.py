from django.contrib import admin

from .models import AcademicSession, ClassDepartment, ClassSubject, Department, Period, Room, Timetable, TimetableSlot

admin.site.register(AcademicSession)
admin.site.register(ClassDepartment)
admin.site.register(ClassSubject)
admin.site.register(Department)
admin.site.register(Period)
admin.site.register(Room)
admin.site.register(Timetable)
admin.site.register(TimetableSlot)
