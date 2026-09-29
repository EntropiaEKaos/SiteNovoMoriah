import type {TenantContext} from "./tenant-context";
import {assertPropertyBoundary,assertSameTenant,type OwnedResource} from "./hospitality-boundary";

export type ReservationOwned=OwnedResource&{accommodationId?:string;guestId?:string|null};

export function assertReservationAccess(ctx:TenantContext,reservation:ReservationOwned){assertPropertyBoundary(ctx,reservation)}

export function assertReservationComposition(reservation:ReservationOwned,accommodation:OwnedResource,guest?:OwnedResource|null){
  assertSameTenant(reservation,accommodation,...(guest?[guest]:[]));
  if(!reservation.propertyId||!accommodation.propertyId||reservation.propertyId!==accommodation.propertyId)throw new Error("SAAS_CROSS_PROPERTY_BOOKING");
}

export function assertReservationChild(reservation:OwnedResource,child:OwnedResource){
  assertSameTenant(reservation,child);
  if(reservation.propertyId!==child.propertyId)throw new Error("SAAS_CROSS_PROPERTY_RESERVATION_CHILD");
}
