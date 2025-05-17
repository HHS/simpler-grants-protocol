from abc import ABC, abstractmethod
from datetime import datetime, UTC
from typing import Annotated, Any, final
from uuid import UUID, uuid4

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.models.opp_base import OpportunityBase
from common_grants_sdk.schemas.models.opp_funding import OppFunding
from common_grants_sdk.schemas.models.opp_status import OppStatus
from common_grants_sdk.schemas.models.opp_timeline import OppTimeline


class OpportunityTransformer(CommonGrantsBaseModel, ABC):
    """
    Base class for transforming arbitrary data structures
    into canonical models.
    """

    source_data: Annotated[
        dict[str, Any],
        Field(
            description="Arbitrary source data",
        ),
    ]

    def transform_opportunity(self, id: UUID | None = None) -> OpportunityBase:
        """
        Extract and transform opportunity data from source_data
        into a canonical OpportunityBase model instance.
        """

        return OpportunityBase(
            id=id or self._generate_id(),
            title=self.transform_opportunity_title(),
            description=self.transform_opportunity_description(),
            status=self.transform_opportunity_status(),
            funding=self.transform_opportunity_funding(),
            key_dates=self.transform_opportunity_timeline(),
            created_at=self._current_timestamp(),
            last_modified_at=self._current_timestamp(),
        )

    @abstractmethod
    def transform_opportunity_description(self) -> str:
        """
        Extract and transform description data from source_data
        into a canonical description string.
        """

        pass

    @abstractmethod
    def transform_opportunity_funding(self) -> OppFunding:
        """
        Extract and transform funding data from source_data
        into a canonical OppFunding model instance.
        """

        pass

    @abstractmethod
    def transform_opportunity_status(self) -> OppStatus:
        """
        Extract and transform status data from source_data
        into a canonical OppStatus model instance.
        """

        pass

    @abstractmethod
    def transform_opportunity_timeline(self) -> OppTimeline:
        """
        Extract and transform timeline data from source_data
        into a canonical OppTimeline model instance.
        """

        pass

    @abstractmethod
    def transform_opportunity_title(self) -> str:
        """
        Extract and transform title data from source_data
        into a canonical title string.
        """

        pass

    @final
    def _generate_id(self) -> UUID:
        """Generate unique ID for the opportunity."""
        return uuid4()

    @final
    def _current_timestamp(self) -> datetime:
        """Get current timestamp."""
        return datetime.now(UTC)
