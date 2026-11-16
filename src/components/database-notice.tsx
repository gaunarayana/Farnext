import { publicDatabaseMessage } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DatabaseNotice({ error }: { error: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Database not connected</CardTitle>
        <CardDescription>
          The page is up. The database query did not finish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6">{publicDatabaseMessage(error)}</p>
      </CardContent>
    </Card>
  );
}
