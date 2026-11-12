export class OfferNotFoundError extends Error {
  constructor() {
    super("Offer not found");
    this.name = "OfferNotFoundError";
  }
}

export class OfferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferValidationError";
  }
}
