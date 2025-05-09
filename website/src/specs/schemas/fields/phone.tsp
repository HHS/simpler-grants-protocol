namespace CommonGrants.Fields;

/** A phone number. */
@example(#{
    countryCode: "+1",
    number: "555-123-4567",
    extension: "123",
    isMobile: true,
})
model Phone {
    /** The international country code (e.g., "+1" for US/Canada). */
    countryCode: string;

    /** The local phone number without the country code. */
    number: string;

    /** Optional extension number for the phone line. */
    extension?: string;

    /** Indicates whether this is a mobile/cell phone number. */
    isMobile: boolean = false;
}
