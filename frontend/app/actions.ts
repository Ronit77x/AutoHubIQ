"use server";

import { refresh } from "next/cache";
import { login } from "../lib/server/login";
import { register } from "../lib/server/register";
import { logout } from "../lib/server/logout";
import { createListing } from "../lib/server/create-listing";
import { updateListing } from "../lib/server/update-listing";
import { uploadImage } from "../lib/server/upload-image";
import { reviewDealer } from "../lib/server/admin-dealers";
import { submitEnquiry } from "../lib/server/enquiry";
import { updateOffer } from "../lib/server/update-offer";
import { deleteVehicle } from "../lib/server/delete-vehicle";

export async function loginAction(input: unknown) { return login(input); }
export async function registerAction(input: unknown) { return register(input); }
export async function logoutAction() { return logout(); }
export async function createListingAction(input: unknown) { const result = await createListing(input); if (result.ok) refresh(); return result; }
export async function updateListingAction(id: string, input: unknown) { const result = await updateListing(id, input); if (result.ok) refresh(); return result; }
export async function uploadImageAction(id: string, form: FormData) { const result = await uploadImage(id, form); if (result.ok) refresh(); return result; }
export async function reviewDealerAction(input: unknown) { const result = await reviewDealer(input); if (result.ok) refresh(); return result; }
export async function submitEnquiryAction(id: string, input: unknown) { const result = await submitEnquiry(id, input); if (result.ok) refresh(); return result; }
export async function updateOfferAction(id: string, input: unknown) { const result = await updateOffer(id, input); if (result.ok) refresh(); return result; }
export async function deleteVehicleAction(id: string) { const result = await deleteVehicle(id); if (result.ok) refresh(); return result; }
