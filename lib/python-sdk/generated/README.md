# Auto-generated Pydantic Schema

This is current home for auto generated schemas, this is a work in progress feature. The intent of this work is to move away from manual management of pydantic schemas and have it be handled by the scripts inside of this `generated` directory

 These schemas should not be updated as re-generating the script will overwrite all updates done manually. 

## Additional Documentation
The plugin used to generate these is [here](https://koxudaxi.github.io/datamodel-code-generator/)



## Usage

To generate pydantic schemas call this script [generate_models.sh](./scripts/generate_models.sh) with 2 inputs. 
1. The input directory for the JSONSchema yamls 
2. The desired output location for both the copied yamls and the generated pydantic schemas.

```
./generate_models.sh ../../../../website/public/schemas/yaml .
```

The above command will put copies of the updated yaml files and the pydantic schemas into the given output directory under the `schemas` and `pydantic` folders respectively


## Under the hood
The main entrypoint for creating the schemas is the ./generate_models.sh command shown above. A breakdown of that script and it's steps are as follows
- All yaml files from the given input directory are copied to the output directory
- The copied yaml files are then updated to add a `title` field to each file that has a value that matches the file name.  This enables each pydantic schema file to have a model with a name that matches the file name.
- The previous two steps occur within the `rename_and_add_title.sh` script
- After the rename script runs we then call the datamodel-code-generator library to take each of the yaml files and process them into a `/pydantic` folder in the given output directory. 

## Issues to be Resolved
    The following issues are from comparing the generated schemas against the existing hand built schemas. Note this is not an exhaustive list

For more detailed information on the below issues see [this comment](https://github.com/HHS/simpler-grants-protocol/pull/452#discussion_r2683046281) for side-by-side comparison

<details>
<summary> Filters NumberRange Property </summary>

Manual
```python
class NumberRange(CommonGrantsBaseModel):
    """Represents a range between two numeric values."""

    min: Union[int, float] = Field(..., description="The minimum value in the range")
    max: Union[int, float] = Field(..., description="The maximum value in the range")
```

Generated
```python
class Value(CommonGrantsBaseModel):
    min: float
    max: float


class NumberRangeFilter(CommonGrantsBaseModel):
    operator: RangeOperators = Field(
        ..., description='The operator to apply to the filter value'
    )
    value: Value = Field(
        ...,
        description='The value to use for the filter operation',
        examples=[{'min': 1000, 'max': 10000}],
        json_schema_extra={'unevaluatedProperties': {'not': {}}},
    )

```
</details>

<details>
<summary> SingleDate Event String vs Literal (Applies to all EventType</summary>

Manual
```python
# Single Date Event
class SingleDateEvent(EventBase):
    """Description of an event that has a date (and possible time) associated with it."""

    event_type: Literal[EventType.SINGLE_DATE] = Field(
        EventType.SINGLE_DATE,
        alias="eventType",
    )
    date: ISODate = Field(
        ...,
        description="Date of the event in ISO 8601 format: YYYY-MM-DD",
    )
    time: Optional[ISOTime] = Field(
        default=None,
        description="Time of the event in ISO 8601 format: HH:MM:SS",
    )

```

Generated
```python

class SingleDateEvent(EventBase):
    event_type: Literal['singleDate'] = Field(
        ..., alias='eventType', description='Type of event'
    )
    date: isoDate.IsoDate = Field(
        ..., description='Date of the event in in ISO 8601 format: YYYY-MM-DD'
    )
    time: Optional[isoTime.IsoTime] = Field(
        default=None, description='Time of the event in ISO 8601 format: HH:MM:SS'
    )


```
</details>

<details>
<summary>Event.py set under __root__ vs Event = Union </summary>

Manual
```python
# Event Union
Event = Union[SingleDateEvent, DateRangeEvent, OtherEvent]

```

Generated
```python

class Event(RootModel[Union[SingleDateEvent, DateRangeEvent, OtherEvent]]):
    root: Union[SingleDateEvent, DateRangeEvent, OtherEvent] = Field(
        ...,
        description='Union of all event types',
        json_schema_extra={'$schema': 'https://json-schema.org/draft/2020-12/schema'},
        title='Event',
    )

```
</details>

<details>
<summary>DefaultFilter value property is Any instead of Union</summary>

Manual
```python

class DefaultFilter(CommonGrantsBaseModel):
    """Base class for all filters that matches Core v0.1.0 DefaultFilter structure."""

    operator: Union[
        EquivalenceOperator,
        ComparisonOperator,
        ArrayOperator,
        StringOperator,
        RangeOperator,
    ] = Field(..., description="The operator to apply to the filter value")
    value: Union[str, int, float, list, dict] = Field(
        ...,
        description="The value to use for the filter operation",
    )

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            # Try to match against each operator type
            for operator_class in [
                EquivalenceOperator,
                ComparisonOperator,
                ArrayOperator,
                StringOperator,
                RangeOperator,
            ]:
                try:
                    return operator_class(v)
                except ValueError:
                    continue
            # If no match found, raise ValueError
            raise ValueError(f"Invalid operator: {v}")
        return v

```

Generated
```python
class DefaultFilter(CommonGrantsBaseModel):
    operator: Union[
        EquivalenceOperators,
        ComparisonOperators,
        ArrayOperators,
        StringOperators,
        RangeOperators,
        AllOperators,
    ] = Field(..., description='The operator to apply to the filter value')
    value: Any = Field(..., description='The value to use for the filter operation')

```

</details>

## Future Work/ Next Steps

### Manual Verification of Pydantic Schemas

### Steps Taken
1. Update the `common-grants-sdk` setting in /templates/fast-api/pyproject.toml comment line 10 uncomment line 11
2. Run the generate_models.sh script
3. Update the `__init__.py` inside of [`/generated`](../generated/scripts/pydantic/__init__.py) (This assumes you ran the generations script from the scripts directory where this README resides and used an output direcotry of . as the second argument) to export the generated models
4.  Update the `__init__.py` inside of [`templates/fast-api/src/common_grants/schemas/__init__.py`](../../../templates/fast-api/src/common_grants/schemas/__init__.py) to point to `common_grants_sdk.schemas.pydantic.generated`
5. Run `make check-types`, this will return an error
6. Address errors as needed until the `make` command passes
7. Add the auto-generated schemas to the existing schema objects so that the existing schema objects are wrapping the auto-generated objects
8. Stand up the fast-api template and verify that things work as expected



### Gaps Identified
1. We are missing the title field inside the JSONSchema YAML files, this should be fixed from the typespec generation but as a workaround for verifying our auto-generation a temp script will be included to add this field to a separate copy of the jsonSchema.yaml files 
2. The manual pydantic models have small variations in their naming from the JSONSchema (ArrayOperator vs ArrayOperators). As a workaround to this we will try and alias these to minimize the impact of the changes while we are testing. 


### Complete/merge in the property based testing
- Property based testing will be merged in a future PR
- The hypothesis library has the ability to fine tune the specific properties to expand our scope
- Break out the `validate_all` python script to pytest framework based approach
- Set up the above pytests to be omitted from any automatic test runs until the automated schemas are being leveraged by the rest of the client code

### Cutover
When it comes time to transition from the hand built pydantic schemas to the auto generated ones the existing hand built pydantic files should remain in place and should be updated to become a wrapper for the properties contained within the auto-generated schema.  

This allows us to preserve any helper functions we've built as well as avoids additional work updating wherever the existing schemas are called within the codebase. 