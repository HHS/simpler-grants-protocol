from enum import Enum

class OpportunityStatus(str, Enum):
    """Status of a funding opportunity."""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class ApplicationStatus(str, Enum):
    """Status of a grant application."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class AwardStatus(str, Enum):
    """Status of a grant award."""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"
    SUSPENDED = "suspended" 