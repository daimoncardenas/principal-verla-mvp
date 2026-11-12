"use client";

import { useSession } from "../../components/session-context";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
} from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useApiData } from "../../lib/hooks";
import { hasPermission } from "../../lib/permissions";
import type { Offer } from "../../lib/types";

export default function OffersPage() {
  const session = useSession();
  const canList = hasPermission(session.permissions, "OFFER_LIST");
  const offers = useApiData<{ offers: Offer[] }>(
    canList ? "/api/offers" : null,
  );

  if (!canList) {
    return (
      <>
        <PageHeader title="Ofertas" />
        <Alert tone="error">
          Tu cuenta no tiene permiso OFFER_LIST para consultar ofertas.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ofertas"
        description="Ofertas publicadas y vigentes de VERLA para la red de aliados."
      />

      <Card>
        <CardHeader
          title="Ofertas vigentes"
          description="La organización publica y archiva las ofertas desde el backoffice."
        />
        <div className="card-body">
          {offers.error ? <Alert tone="error">{offers.error}</Alert> : null}
          {offers.loading ? <Spinner label="Cargando ofertas…" /> : null}
          {!offers.loading && (offers.data?.offers.length ?? 0) === 0 ? (
            <EmptyState
              title="No hay ofertas vigentes"
              description="Cuando VERLA publique una oferta, aparecerá en este listado y en el dashboard."
            />
          ) : null}
          {(offers.data?.offers.length ?? 0) > 0 ? (
            <div className="grid-2">
              {offers.data?.offers.map((offer) => (
                <div key={offer.id} className="card">
                  <div className="offer-media">
                    {offer.images[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={offer.images[0].url}
                        alt={offer.images[0].alt_text}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      "Oferta VERLA"
                    )}
                  </div>
                  <div className="card-body offer-card">
                    <div className="flex-between">
                      <h3>{offer.title}</h3>
                      <Badge tone="success">Publicada</Badge>
                    </div>
                    <p className="text-sm muted">{offer.content}</p>
                    <p className="text-xs muted">
                      Vigencia: {formatDate(offer.starts_at)} —{" "}
                      {formatDate(offer.ends_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
