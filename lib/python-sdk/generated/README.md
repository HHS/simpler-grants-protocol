# Auto-generated Pydantic Schema

This is the potential future home for auto generated schemas. These schemas should not be updated as re-generating the script will overwrite all updates done manually. 

The tool used to generate these is [here](https://koxudaxi.github.io/datamodel-code-generator/)

## Usage

The invocation of this tool is from the script [generate_models.sh](../../../../generate_models.sh)

Tests for the auto generated schemas can be run from this path
`lib/python-sdk/common_grants_sdk/schemas/pydantic/validators`

For troubleshooting purposes there are two commands available

Validates all JSONschemas against their auto-generated pydantic counterpart

    poetry run  python ./validate_all.py 
   or 

Validate generating dummy data from JSONSchema spec (Useful for drilling down into issues)

    poetry run python ./validate.py <PATH TO YAML FILE >

## Issues to be Resolved
    The following issues are from comparing the generated schemas against the existing hand built schemas. Note this is not an exhaustive list


- filters.numeric.NumberRange field properties
- SingleDateEvent eventType comes in as string not a Literal[EventType.SINGLE_DATE] (This applies to all EventType)
- Event.py union is set under __root__ instead of just Event = Union
- DefaultFilter value property is Any instead of Union
- @Field_validator and @classmethod functions are currently missing`


## Testing
There is a foundation for property based testing implemented that is located in the validators directory [Here is one of the testing files](../validators/validate.py)

## Future Work/ Next Steps

### Expand the property based testing
- The hypothesis library has the ability to fine tune the specific properties to expand our scope
- Break out the `validate_all` python script to pytest framework based approach
- Set up the above pytests to be omitted from any automatic test runs until the automated schemas are being leveraged by the rest of the client code

### Implementation
When it comes time to transition from the hand built pydantic schemas to the auto generated ones the existing hand built pydantic files should remain in place and should be updated to become a wrapper for the properties contained within the auto-generated schema.  

This allows us to preserve any helper functions we've built as well as avoids additional work updating wherever the existing schemas are called within the codebase. 