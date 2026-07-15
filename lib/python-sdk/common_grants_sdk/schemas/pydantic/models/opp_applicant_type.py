"""Applicant type models for funding opportunities."""

from enum import StrEnum
from typing import Optional

from pydantic import ConfigDict, Field

from ..base import CommonGrantsBaseModel


class ApplicantTypeOptions(StrEnum):
    """Allowed applicant types for a funding opportunity."""

    individual = "individual"
    organization = "organization"
    government_state = "government_state"
    government_county = "government_county"
    government_municipal = "government_municipal"
    government_special_district = "government_special_district"
    government_tribal = "government_tribal"
    organization_tribal_other = "organization_tribal_other"
    school_district_independent = "school_district_independent"
    higher_education_public = "higher_education_public"
    higher_education_private = "higher_education_private"
    non_profit_with_501c3 = "non_profit_with_501c3"
    nonprofit_without_501c3 = "nonprofit_without_501c3"
    for_profit_small_business = "for_profit_small_business"
    for_profit_not_small_business = "for_profit_not_small_business"
    unrestricted = "unrestricted"
    custom = "custom"


class ApplicantType(CommonGrantsBaseModel):
    """Represents a single accepted applicant type for a funding opportunity."""

    model_config = ConfigDict(populate_by_name=True)

    value: ApplicantTypeOptions = Field(
        ...,
        description="The applicant type value from a predefined set of options",
    )
    custom_value: Optional[str] = Field(
        default=None,
        validation_alias="customValue",
        serialization_alias="customValue",
        description="A custom applicant type value, only meaningful when value='custom'",
    )
    description: Optional[str] = Field(
        default=None,
        description="A human-readable description of the applicant type",
    )
