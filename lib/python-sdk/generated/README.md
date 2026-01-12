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
- filters.numeric.NumberRange field properties
- SingleDateEvent eventType comes in as string not a Literal[EventType.SINGLE_DATE] (This applies to all EventType)
- Event.py union is set under __root__ instead of just Event = Union
- DefaultFilter value property is Any instead of Union
- @Field_validator and @classmethod functions are currently missing`



## Future Work/ Next Steps

### Manual Verification of Pydantic Schemas

### Steps Taken
1. Update the `common-grants-sdk` setting in `/templates/fast-api/pyproject.toml` comment line 10 uncomment line 11
2. Run the generate_models.sh script
3. Update the `__init__.py` inside of `lib/python-sdk/common_grants_sdk/schemas/pydantic/generated` to export the generated models
4.  Update the `__init__.py` inside of `templates/fast-api/src/common_grants/schemas/__init__.py` to point to `common_grants_sdk.schemas.pydantic.generated`
5. Run `make check-types`, this will return an error
6. Address errors as needed until the `make` command passes
7. Add the auto-generated schemas to the existing schema objects so that the existing schema objects are wrapping the auto-generated objects
8. Stand up the fast-api template and verify that things work as



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