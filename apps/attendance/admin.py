from django.contrib import admin

from .models import AttendanceDailyReport, AttendanceMonthlyReport, StudentAttendance, StudentAttendanceSession, TeacherAttendance

admin.site.register(AttendanceDailyReport)
admin.site.register(AttendanceMonthlyReport)
admin.site.register(StudentAttendance)
admin.site.register(StudentAttendanceSession)
admin.site.register(TeacherAttendance)
