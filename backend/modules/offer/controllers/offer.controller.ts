import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { ForbiddenError } from "../../authorization/services/permission.service";
import type { AuthContext } from "../../auth/types/auth.types";
import {
  OfferNotFoundError,
  OfferValidationError,
} from "../services/offer.errors";
import {
  getVisibleOffer,
  listVisibleOffers,
} from "../services/offer.service";

type OfferDocument = Awaited<ReturnType<typeof getVisibleOffer>>;

function parseOfferId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new OfferValidationError("Invalid offer id");
  }

  return new Types.ObjectId(value);
}

export function serializeOffer(offer: OfferDocument) {
  return {
    id: offer._id.toString(),
    title: offer.title,
    content: offer.content,
    images: [...offer.images]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((image) => ({
        url: image.url,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
      })),
    starts_at: offer.starts_at?.toISOString() ?? null,
    ends_at: offer.ends_at?.toISOString() ?? null,
    published_at: offer.published_at?.toISOString() ?? null,
    commercial_terms: offer.commercial_terms
      ? {
          price_amount: offer.commercial_terms.price_amount,
          currency: offer.commercial_terms.currency,
          billing_period: offer.commercial_terms.billing_period,
          benefits: [...offer.commercial_terms.benefits],
          conditions: [...offer.commercial_terms.conditions],
        }
      : null,
  };
}

export async function handleList(context: AuthContext) {
  const offers = await listVisibleOffers(context);

  return { offers: offers.map(serializeOffer) };
}

export async function handleGet(
  context: AuthContext,
  offerId: string,
) {
  const offer = await getVisibleOffer(context, parseOfferId(offerId));

  return { offer: serializeOffer(offer) };
}

export function offerErrorResponse(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof OfferValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof OfferNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
