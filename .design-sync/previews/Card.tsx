import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from "minerva-flow";

export function Default() {
  return (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Terrasse — Table 12</CardTitle>
        <CardDescription>Opened 18 minutes ago · 4 guests</CardDescription>
        <CardAction>
          <Badge tone="green" dot>
            Active
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-mv-ink-soft">
          2× Tartare de saumon, 1× Risotto aux champignons, 1× Burger Minerva.
        </p>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-sm font-medium">84,50 $</span>
        <Button size="sm" variant="secondary">
          View order
        </Button>
      </CardFooter>
    </Card>
  );
}

export function Compact() {
  return (
    <Card size="sm" className="w-[280px]">
      <CardHeader>
        <CardTitle>Réservations aujourd'hui</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-mv-ink-soft">12 réservations · 3 en attente</p>
      </CardContent>
    </Card>
  );
}

export function NoFooter() {
  return (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle>Revenu net</CardTitle>
        <CardDescription>Cette semaine</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-heading font-medium">6 420 $</p>
      </CardContent>
    </Card>
  );
}
