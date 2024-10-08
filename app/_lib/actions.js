"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBookings } from "./data-service";
import { redirect } from "next/navigation";

async function verifyUserActionAllowed(bookingId, actionName) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  //check if the booking to be deleted is in the list of the current session user
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingsIds = guestBookings.map((booking) => booking.id);
  console.log(guestBookingsIds);
  console.log(+bookingId);

  if (!guestBookingsIds.includes(+bookingId))
    throw new Error(`You are not allowed to ${actionName} this booking`);
}

export async function updateGuestProfile(formData) {
  //1. Authentication and Authorization
  const session = await auth();
  //NOTE: it's a good practice not to use try/catch blocks in SA.
  //Just throw a new error that will be caught by the closest Error boundary (error.js in this case)
  if (!session) throw new Error("You must be logged in");

  //2. Get and validate data
  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationality, countryFlag, nationalID };

  //3. Update data into DB
  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId);

  if (error) {
    throw new Error("Your guest details could not be updated");
  }

  //4. Revalidate cache, so that data is updated on the client

  revalidatePath("/account/profile");
}

export async function updateReservation(formData) {
  const bookingId = formData.get("bookingId");
  await verifyUserActionAllowed(bookingId, "edit");

  const observations = formData.get("observations");
  const numGuests = formData.get("numGuests");

  const updatedFields = { observations, numGuests };

  const { error } = await supabase
    .from("bookings")
    .update(updatedFields)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    throw new Error("Booking could not be updated");
  }

  revalidatePath("/account/reservations");
  revalidatePath("/account/reservations/edit/[reservationId]", "page");
  redirect("/account/reservations");
}

export async function deleteBooking(bookingId) {
  await verifyUserActionAllowed(bookingId, "delete");

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    throw new Error("Your reservation could not be deleted");
  }

  revalidatePath("/account/reservations");
}

export async function createBooking(bookingData, formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  //NEW: getting all data from the form at once
  //const formDataObj = Object.entries(formData.entries());

  //NOTE: axtra data validation can be added with a lib like "zod", for example

  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: +formData.get("numGuests"),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
    status: "unconfirmed",

    //...formDataObj,
  };

  const { error } = await supabase.from("bookings").insert([newBooking]);

  if (error) {
    throw new Error("Booking could not be created");
  }

  revalidatePath(`/cabins/${bookingData.cabinId}`);
  redirect("/cabins/thankyou");
}

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
