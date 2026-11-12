import "server-only";

import type { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { assertPermission } from "../../authorization/services/permission.service";
import type { AuthContext } from "../../auth/types/auth.types";
import type { Offer } from "../entities/offer.entity";
import {
  findVisibleOfferRecord,
  listVisibleOfferRecords,
} from "../repository/offer.repository";
import { OfferNotFoundError } from "./offer.errors";

type OfferDocument = HydratedDocument<Offer>;

export async function listVisibleOffers(
  context: AuthContext,
): Promise<OfferDocument[]> {
  await assertPermission(context, "OFFER_LIST");

  const referenceInstant = new Date();

  return listVisibleOfferRecords(
    context.organization_id,
    referenceInstant,
  );
}

export async function getVisibleOffer(
  context: AuthContext,
  offerId: Types.ObjectId,
): Promise<OfferDocument> {
  await assertPermission(context, "OFFER_READ");

  const referenceInstant = new Date();
  const offer = await findVisibleOfferRecord(
    offerId,
    context.organization_id,
    referenceInstant,
  );

  if (!offer) {
    throw new OfferNotFoundError();
  }

  return offer;
}
