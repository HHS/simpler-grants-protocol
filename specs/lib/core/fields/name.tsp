namespace CommonGrants.Fields;

/** A person's name. */
@example(Examples.Name.janeDoe)
model Name {
    /** Honorific prefix (e.g., Mr., Mrs., Dr., Prof.). */
    prefix?: string;

    /** The person's first or given name. */
    firstName: string;

    /** The person's middle name or names. */
    middleName?: string;

    /** The person's last name or family name. */
    lastName: string;

    /** Name suffix (e.g., Jr., Sr., III, Ph.D.). */
    suffix?: string;
}

namespace Examples.Name {
    const janeDoe = #{
        prefix: "Dr.",
        firstName: "Jane",
        middleName: "Edward",
        lastName: "Doe",
        suffix: "Jr.",
    };
}
