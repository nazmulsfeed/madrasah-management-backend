from django.contrib import admin

from .models import HifzDailyProgress, HifzEnrollment, HifzMistake, HifzMonthlyTracking

admin.site.register(HifzDailyProgress)
admin.site.register(HifzEnrollment)
admin.site.register(HifzMistake)
admin.site.register(HifzMonthlyTracking)
