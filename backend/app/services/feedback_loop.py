from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.attempt import TestAttemptModel, AttemptResponseModel
from backend.app.models.question import QuestionModel
from backend.app.models.task import StudyTaskModel


class FeedbackLoopService:
    @staticmethod
    def analyze_task_outcome(
        db: Session,
        task_id: str,
        student_id: str = "student-aarav-01"
    ) -> Dict[str, Any]:
        """
        Analyzes the before-and-after concept performance for a completed study task.
        Clearly labels findings as observed empirical association, not guaranteed causation.
        """
        task = db.query(StudyTaskModel).filter_by(id=task_id, student_id=student_id).first()
        if not task:
            return {
                "taskId": task_id,
                "status": "not_found",
                "message": f"Study task '{task_id}' not found."
            }

        if not task.completed:
            return {
                "taskId": task.id,
                "topic": task.topic,
                "subject": task.subject,
                "status": "pending_completion",
                "message": "Study task is not yet marked as completed.",
                "disclaimer": "Task outcome analysis activates once the objective is marked completed."
            }

        cutoff = task.completed_at or task.updated_at or task.created_at

        # Fetch all completed attempts ordered chronologically
        attempts = db.query(TestAttemptModel).filter(
            TestAttemptModel.student_id == student_id,
            TestAttemptModel.status == "completed"
        ).order_by(TestAttemptModel.start_time.asc()).all()

        if not attempts:
            return {
                "taskId": task.id,
                "topic": task.topic,
                "subject": task.subject,
                "status": "insufficient_data",
                "message": "Not enough data yet. No completed test attempts found.",
                "preQuestionCount": 0,
                "postQuestionCount": 0,
                "disclaimer": "Observed before-and-after association, not proof of causality."
            }

        # Divide attempts into baseline (pre-completion) and post-completion
        pre_attempt_ids = [a.id for a in attempts if a.start_time <= cutoff]
        post_attempt_ids = [a.id for a in attempts if a.start_time > cutoff]

        # In case the task was completed very recently and no attempts were taken strictly after,
        # we check if attempts exist across the student history to measure topic progression
        pre_responses = []
        if pre_attempt_ids:
            pre_responses = db.query(AttemptResponseModel, QuestionModel).join(
                QuestionModel, AttemptResponseModel.question_id == QuestionModel.id
            ).filter(
                AttemptResponseModel.attempt_id.in_(pre_attempt_ids),
                QuestionModel.topic.ilike(f"%{task.topic}%")
            ).all()

        post_responses = []
        if post_attempt_ids:
            post_responses = db.query(AttemptResponseModel, QuestionModel).join(
                QuestionModel, AttemptResponseModel.question_id == QuestionModel.id
            ).filter(
                AttemptResponseModel.attempt_id.in_(post_attempt_ids),
                QuestionModel.topic.ilike(f"%{task.topic}%")
            ).all()

        min_sample = 2
        if len(pre_responses) < min_sample or len(post_responses) < min_sample:
            pre_acc = round(sum(1 for r, _ in pre_responses if r.is_correct) / len(pre_responses) * 100, 1) if pre_responses else None
            post_acc = round(sum(1 for r, _ in post_responses if r.is_correct) / len(post_responses) * 100, 1) if post_responses else None
            return {
                "taskId": task.id,
                "topic": task.topic,
                "subject": task.subject,
                "completedAt": cutoff.isoformat() if cutoff else None,
                "status": "insufficient_data",
                "message": f"Not enough data yet. Minimum {min_sample} questions required in both baseline and post-completion attempts (found: {len(pre_responses)} pre, {len(post_responses)} post).",
                "preQuestionCount": len(pre_responses),
                "postQuestionCount": len(post_responses),
                "preAccuracy": pre_acc,
                "postAccuracy": post_acc,
                "accuracyDelta": round(post_acc - pre_acc, 1) if (pre_acc is not None and post_acc is not None) else None,
                "disclaimer": "Observed before-and-after improvement or association, not proof that the study task caused the improvement."
            }

        pre_correct = sum(1 for r, _ in pre_responses if r.is_correct)
        post_correct = sum(1 for r, _ in post_responses if r.is_correct)

        pre_accuracy = round((pre_correct / len(pre_responses)) * 100, 1)
        post_accuracy = round((post_correct / len(post_responses)) * 100, 1)
        accuracy_delta = round(post_accuracy - pre_accuracy, 1)

        outcome_status = "improved" if accuracy_delta >= 10.0 else "declined" if accuracy_delta <= -10.0 else "stable"

        return {
            "taskId": task.id,
            "topic": task.topic,
            "subject": task.subject,
            "completedAt": cutoff.isoformat() if cutoff else None,
            "status": outcome_status,
            "preAccuracy": pre_accuracy,
            "postAccuracy": post_accuracy,
            "accuracyDelta": accuracy_delta,
            "preQuestionCount": len(pre_responses),
            "postQuestionCount": len(post_responses),
            "message": f"Observed topic accuracy shifted from {pre_accuracy}% to {post_accuracy}% ({'+' if accuracy_delta > 0 else ''}{accuracy_delta}%) following task completion.",
            "disclaimer": "Observed before-and-after improvement or association across mock attempts. This represents empirical correlation and does not prove that the study task alone caused the improvement."
        }

    @staticmethod
    def evaluate_recommendation_retirement(
        db: Session,
        student_id: str = "student-aarav-01",
        threshold: float = 75.0,
        min_questions: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Evaluates active recommendations against latest attempt performance.
        Allows recommendations to be retired (>=75% accuracy on >= min_questions),
        downgraded in priority (50-74%), or retained as high-priority persistent bottlenecks (<50%).
        """
        # Get all completed attempts
        attempts = db.query(TestAttemptModel).filter(
            TestAttemptModel.student_id == student_id,
            TestAttemptModel.status == "completed"
        ).all()

        attempt_ids = [a.id for a in attempts]
        if not attempt_ids:
            return []

        # Aggregate performance by topic across all responses
        topic_stats: Dict[str, Dict[str, Any]] = {}
        responses = db.query(AttemptResponseModel, QuestionModel).join(
            QuestionModel, AttemptResponseModel.question_id == QuestionModel.id
        ).filter(
            AttemptResponseModel.attempt_id.in_(attempt_ids)
        ).all()

        for resp, q in responses:
            top = q.topic or q.chapter or "General"
            if top not in topic_stats:
                topic_stats[top] = {
                    "topic": top,
                    "subject": q.subject,
                    "total": 0,
                    "correct": 0,
                    "timeSum": 0.0
                }
            topic_stats[top]["total"] += 1
            if resp.is_correct:
                topic_stats[top]["correct"] += 1
            if resp.time_spent_seconds:
                topic_stats[top]["timeSum"] += resp.time_spent_seconds

        evaluations = []
        for top_name, stats in topic_stats.items():
            n = stats["total"]
            accuracy = round((stats["correct"] / n) * 100, 1) if n > 0 else 0.0

            # Find matching tasks in study_tasks
            tasks = db.query(StudyTaskModel).filter(
                StudyTaskModel.student_id == student_id,
                StudyTaskModel.topic.ilike(f"%{top_name}%")
            ).all()

            if n >= min_questions and accuracy >= threshold:
                status = "retired"
                priority = "Low"
                reason = f"Concept mastery verified: {accuracy}% accuracy across {n} evaluated questions (threshold: {threshold}%). Recommendation retired from active bottleneck queue."
                for t in tasks:
                    t.retirement_status = "retired"
                    t.retirement_reason = reason
            elif n >= min_questions and 50.0 <= accuracy < threshold:
                status = "improving"
                priority = "Medium"
                reason = f"Concept accuracy improved to {accuracy}% across {n} questions. Priority reduced from High to Medium."
                for t in tasks:
                    if t.retirement_status != "retired":
                        t.retirement_status = "improving"
                        t.retirement_reason = reason
                        t.priority = "Medium"
            elif n >= min_questions and accuracy < 50.0:
                status = "active"
                priority = "High"
                reason = f"Persistent bottleneck: {accuracy}% accuracy across {n} questions. Retained in high-priority revision queue."
                for t in tasks:
                    if t.retirement_status != "retired":
                        t.retirement_status = "active"
                        t.retirement_reason = reason
            else:
                status = "active"
                priority = "High" if accuracy < 50 else "Medium"
                reason = f"Baseline data gathering in progress ({n}/{min_questions} questions attempted, {accuracy}% accuracy)."

            evaluations.append({
                "topic": top_name,
                "subject": stats["subject"],
                "attemptedQuestions": n,
                "correctCount": stats["correct"],
                "accuracy": accuracy,
                "status": status,
                "priority": priority,
                "threshold": threshold,
                "rationale": reason,
                "associatedTasksCount": len(tasks)
            })

        db.commit()
        evaluations.sort(key=lambda x: (x["status"] == "retired", x["accuracy"]))
        return evaluations
