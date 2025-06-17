"""
Date transformation utilities for the CA Grants Portal data transformer.

This module provides functionality to transform various date formats into
standardized datetime objects.
"""

import re
from datetime import datetime
from enum import Enum


class DateFormat(Enum):
    """Enum for date format types."""

    LONG = "9999-12-31 23:59:59"
    SHORT = "12/31/99"


def transform_date(date_str: str, output_format: DateFormat) -> datetime:
    """
    Transform a date string to a datetime object.

    Args:
        date_str: The date string to transform
        output_format: The desired output format (SHORT or LONG)

    Returns:
        A datetime object in the specified format

    Raises:
        ValueError: If the date string is in an unrecognized format

    """
    # Handle None or empty values by treating them as unknown dates
    if not date_str or date_str.strip() == "":
        return transform_unknown("TBD", output_format)

    # Handle date ranges that start with "through" or similar words
    range_pattern = r"^(?:through|thru|until|to)\s+(.+)$"
    if match := re.match(range_pattern, date_str.lower()):
        date_str = match.group(1).strip()

    # List of transformers to try, in order of preference
    transformers = [
        transform_datetime,
        transform_seasonal,
        transform_unknown,
    ]

    for transformer in transformers:
        try:
            return transformer(date_str, output_format)
        except ValueError:
            continue

    msg = f"Unrecognized date format: {date_str}"
    raise ValueError(msg)


def transform_datetime(date_str: str, output_format: DateFormat) -> datetime:
    """
    Transform a datetime string to a datetime object.

    Args:
        date_str: The datetime string to transform
        output_format: The desired output format (SHORT or LONG)

    Returns:
        A datetime object in the specified format

    Raises:
        ValueError: If the datetime string is in an unrecognized format

    """
    # List of format strings to try, in order of preference
    formats = [
        "%Y-%m-%d %H:%M:%S",  # ISO format with time
        "%Y-%m-%d",  # ISO format date only
        "%m/%d/%y",  # MM/DD/YY
        "%m/%d/%Y",  # MM/DD/YYYY
        "%B %d, %Y",  # Month DD, YYYY
        "%B %d,%Y",  # Month DD,YYYY (no space after comma)
        "%B %d %Y",  # Month DD YYYY
        "%B %Y",  # Month YYYY
        "%b %Y",  # Abbreviated Month YYYY
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            if output_format == DateFormat.SHORT:
                # For SHORT format, return date only at midnight
                return dt.replace(hour=0, minute=0, second=0, microsecond=0)
            # For LONG format:
            # - If the format included time (ISO with time), preserve it
            # - Otherwise, set to end of day
            if fmt == "%Y-%m-%d %H:%M:%S":
                return dt
            return dt.replace(hour=23, minute=59, second=59, microsecond=0)
        except ValueError:
            continue

    msg = f"Unrecognized date format: {date_str}"
    raise ValueError(msg)


def transform_unknown(value: str, output_format: DateFormat) -> datetime:
    """
    Transform unknown date values (TBD, etc.) into a far future date.

    Args:
        value: Input date string
        output_format: Desired output format from DateFormat enum

    Returns:
        datetime object in the specified format

    Raises:
        ValueError: If input is not a recognized unknown date value

    """
    unknown_dates = [
        "na",
        "n/a",
        "ongoing",
        "pending",
        "tba",
        "tbd",
        "to be announced",
        "to be determined",
        "continuous",
    ]
    if value.lower() not in unknown_dates:
        e = f"Not an unknown date value: {value}"
        raise ValueError(e)

    # Use future date for unknown date cases
    future_date = "12/31/2099"
    if output_format == DateFormat.LONG:
        future_dt = future_date + " 23:59:59"
        return datetime.strptime(future_dt, "%m/%d/%Y %H:%M:%S")  # noqa: DTZ007
    return datetime.strptime(future_date, "%m/%d/%Y")  # noqa: DTZ007


def transform_seasonal(value: str, output_format: DateFormat) -> datetime:
    """
    Transform seasonal date values (e.g. "Fall '24", "Late Spring 2026")
    into specific dates.

    Args:
        value: Input date string
        output_format: Desired output format from DateFormat enum

    Returns:
        datetime object in the specified format

    Raises:
        ValueError: If input format is not recognized

    """
    # Extract the first season and year if there's a range
    season_year = value.split("-")[0].strip()

    # Parse season and year, ignoring modifiers like "Late", "Early", etc.
    season_match = re.match(
        r"(?:Early|Late|Mid-?)?\s*(Spring|Summer|Fall|Winter)\s+('?)(\d{2,4})",
        season_year,
        re.IGNORECASE,
    )
    if not season_match:
        e = f"Not a seasonal date format: {value}"
        raise ValueError(e)

    season, apostrophe, year = season_match.groups()
    season = season.lower()

    # Convert 2-digit year to 4-digit year
    short_year_length = 2
    if len(year) == short_year_length:
        year = "20" + year

    # Map seasons to approximate dates
    season_dates = {
        "spring": "3/21",  # Spring equinox
        "summer": "6/21",  # Summer solstice
        "fall": "9/22",  # Fall equinox
        "winter": "12/21",  # Winter solstice
    }

    date_str = f"{season_dates[season]}/{year}"
    dt = datetime.strptime(date_str, "%m/%d/%Y")  # noqa: DTZ007

    if output_format == DateFormat.LONG:
        return datetime.strptime(  # noqa: DTZ007
            dt.strftime("%m/%d/%Y") + " 23:59:59",
            "%m/%d/%Y %H:%M:%S",
        )
    return dt
