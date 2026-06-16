import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ActiveStatusModel(models.Model):
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)

    def delete(self):
        return self.update(is_deleted=True, deleted_at=timezone.now())


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_deleted",
    )

    objects = SoftDeleteManager()
    all_objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])


class AuditModel(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated",
    )

    class Meta:
        abstract = True


class Institution(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = ((STATUS_ACTIVE, "Active"), (STATUS_INACTIVE, "Inactive"))

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30, unique=True)
    registration_number = models.CharField(max_length=100, blank=True)
    logo = models.ImageField(upload_to="institutions/logos/", blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)
    established_date = models.DateField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="Asia/Dhaka")
    default_language = models.CharField(max_length=12, default="en")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Branch(UUIDModel, TimeStampedModel, ActiveStatusModel):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_branches",
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["institution", "code"], name="unique_branch_code_per_institution")
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class AcademicYear(UUIDModel, TimeStampedModel, ActiveStatusModel):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="academic_years")
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.UniqueConstraint(fields=["institution", "name"], name="unique_academic_year_per_institution")
        ]

    def __str__(self):
        return self.name


class InstitutionScopedModel(models.Model):
    institution = models.ForeignKey("common.Institution", on_delete=models.PROTECT, related_name="%(app_label)s_%(class)s")
    branch = models.ForeignKey(
        "common.Branch",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s",
    )

    class Meta:
        abstract = True


class Address(UUIDModel, TimeStampedModel):
    owner_type = models.CharField(max_length=50)
    owner_id = models.UUIDField()
    line_1 = models.CharField(max_length=255)
    line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default="Bangladesh")


class AuditLog(UUIDModel, TimeStampedModel):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=100)
    module = models.CharField(max_length=100)
    object_type = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict, blank=True)
