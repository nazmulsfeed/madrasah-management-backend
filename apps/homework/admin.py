from django.contrib import admin

from .models import Homework, HomeworkAttachment, HomeworkReview, HomeworkSubmission

admin.site.register(Homework)
admin.site.register(HomeworkAttachment)
admin.site.register(HomeworkReview)
admin.site.register(HomeworkSubmission)
