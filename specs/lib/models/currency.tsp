namespace OpportunityStream.Models;

model Currency {
    /** The amount of currency */
    amount: float32;

    /** How the currency amount should be displayed */
    display: string;

    /** The currency in which the amount is denominated (e.g., USD) */
    currency: string;
}
