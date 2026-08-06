# Feature Enhancements Implementation Plan

This plan outlines the changes needed for the 6 different enhancements requested.

## User Review Required

Please review the following plan. Some features (especially Exam Marks Bulk Selection) have design decisions that require your approval.

## Open Questions

> [!WARNING]
> **Exam Marks Selection (Task 4):** You mentioned "subject select all and section select all both kora jabe". Currently, the marks table requires you to select one Subject and one Section to load a specific list of students. If we select "All Subjects" and "All Sections", the table will become massive (e.g. 5 subjects x 3 sections = 15 different columns for each student). 
> **My Proposed Solution:** Instead of a complex massive grid, I will change the UI so that you can filter the students by selecting "All Sections" (shows all students in that class for a specific subject). For "All Subjects", I recommend we keep it to one subject at a time to prevent errors when typing marks, but I can add a "Bulk Marks Edit" mode if you really want to view all subjects at once. *For now, I will add "All Sections" and "All Subjects" options, but they will fetch data in a single unified list. I will also add the ability to delete (clear) marks and edit marks directly in the table.* 

## Proposed Changes

---

### 1. Attendance Default Status

**Database:**
- Update `StudentAttendance` model enum to include `not_assigned`.

**Frontend:**
- Modify `AttendancePage.jsx` to include "নির্ধারিত নয়" (not_assigned) as a default option.

---

### 2. Guardian Directory Student Columns

**Frontend:**
- Modify `GuardianDirectoryPage.jsx` to display a new column showing the names and IDs of the linked students.

---

### 3. Guardian Attendance History View

**Backend:**
- Update `attendanceController.js` so that if a guardian/student requests it, they get a history (e.g. past 30 days) of attendance records sorted by date, rather than a single date's records.

**Frontend:**
- Modify `AttendancePage.jsx` for Guardians/Students to remove the date filter and display a date-wise history table of their attendance.

---

### 4. Exam Marks Entry (Edit/Delete & Select All)

**Frontend:**
- Modify `ExamPage.jsx` marks entry workspace.
- Add "সকল বিষয়" (All Subjects) and "সকল শাখা" (All Sections) options in the dropdowns.
- Enable direct editing and clearing (deleting) of marks in the input field. If the mark is cleared (empty), it will delete the record upon saving.

---

### 5. Student Admission Hifz Branch

**Frontend:**
- Modify `StudentCreatePage.jsx` (নতুন ছাত্র/ছাত্রী ভর্তি).
- Add "হিফজ শাখা" (Hifz) option in the branch/department dropdown.

---

### 6. Hostel Page Buttons

**Frontend:**
- The "রুম বিবরণ" (Rooms) and "আবাসিকরা" (Residents) buttons in `HostelPage.jsx` are currently inactive UI elements.
- I will wire them up to show a placeholder modal or toast ("এই ফিচারটি তৈরি হচ্ছে") for now, so they respond to clicks.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
- Log in as Super Admin: check Attendance 'not_assigned' status, check Guardian list columns, check Exam marks "Select All" functionality, check new student admission form, and test Hostel buttons.
- Log in as Guardian: check the new date-wise attendance history view.
