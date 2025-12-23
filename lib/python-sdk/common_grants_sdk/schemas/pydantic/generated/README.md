# Auto-generated Pydantic Schema

This is the potential future home for auto generated schemas. These schemas should not be updated as re-generating the script will overwrite all updates done manually. 

The tool used to generate these is [here](https://koxudaxi.github.io/datamodel-code-generator/)

The invocation of this tool is from the script [generate_models.sh](../../../../generate_models.sh)

## Issues to be Resolved
    The following issues are from comparing the generated schemas against the existing hand built schemas. Note this is not an exhaustive list


- filters.numeric.NumberRange field properties
- SingleDateEvent eventType comes in as string not a Literal[EventType.SINGLE_DATE] (This applies to all EventType)
- Event.py union is set under __root__ instead of just Event = Union
- DefaultFilter value property is Any instead of Union
- @Field_validator and @classmethod functions are currently missing


## Future Work/ Next Steps
Need to write up some property based testing to validate all generated pydantic objects against their existing jsonSchema counterparts, potentially using [this.](https://hypothesis.readthedocs.io/en/latest/) we would need to compare the output of json schema against a pydantic model validate call. 
   
As part of the above we need to find a JSONSchema fake data generator to use in these tests. 