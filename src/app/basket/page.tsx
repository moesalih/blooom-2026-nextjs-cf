import type { Metadata } from "next";
import { BasketPage } from "@/components/basket-page";

export const metadata: Metadata = {
	title: "Basket · Blooom",
	description: "Track your stock portfolio positions",
};

export default function BasketRoute() {
	return <BasketPage />;
}
