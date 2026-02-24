import { type FormEvent, useMemo, useState } from "react";
import { trpc } from "@/client/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file content."));
        return;
      }
      const [, base64] = result.split(",");
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(new Error("File read failed."));
    reader.readAsDataURL(file);
  });

export default function PrintGcode() {
  const printersQuery = trpc.print.getPrinters.useQuery();
  const printerMutation = trpc.print.createPrinter.useMutation({
    onSuccess: () => {
      toast.success("Printer saved.");
      void printersQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.print.uploadAndPrint.useMutation({
    onSuccess: (result) => {
      if (result.status === "DISPATCHED") {
        toast.success("G-code uploaded and dispatched to printer.");
      } else {
        toast.error(result.dispatchError ?? "Failed to dispatch print job.");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const [printerForm, setPrinterForm] = useState({
    name: "",
    type: "PRUSA",
    ipAddress: "",
    authToken: "",
    serialNumber: "",
  });

  const [selectedPrinterIp, setSelectedPrinterIp] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const printerOptions = useMemo(() => printersQuery.data ?? [], [printersQuery.data]);

  const createPrinter = async (e: FormEvent) => {
    e.preventDefault();
    await printerMutation.mutateAsync({
      ...printerForm,
      type: printerForm.type as "PRUSA" | "BAMBU",
      authToken: printerForm.authToken || undefined,
      serialNumber: printerForm.serialNumber || undefined,
    });
    setPrinterForm({
      name: "",
      type: "PRUSA",
      ipAddress: "",
      authToken: "",
      serialNumber: "",
    });
  };

  const submitPrint = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedPrinterIp) {
      toast.error("Select a printer and a .gcode file.");
      return;
    }

    const fileContentBase64 = await readFileAsBase64(selectedFile);
    await uploadMutation.mutateAsync({
      printerIpAddress: selectedPrinterIp,
      fileName: selectedFile.name,
      fileContentBase64,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">G-code Printing</h1>
        <p className="text-muted-foreground">
          Upload a G-code file, hash and archive it, then send it to a configured printer by IP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add printer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPrinter} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={printerForm.name}
                onChange={(e) => setPrinterForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={printerForm.type}
                onValueChange={(value) => setPrinterForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRUSA">Prusa</SelectItem>
                  <SelectItem value="BAMBU">Bambu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IP Address</Label>
              <Input
                placeholder="192.168.1.50"
                value={printerForm.ipAddress}
                onChange={(e) => setPrinterForm((prev) => ({ ...prev, ipAddress: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Prusa API key / token (optional)</Label>
              <Input
                value={printerForm.authToken}
                onChange={(e) => setPrinterForm((prev) => ({ ...prev, authToken: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bambu serial number (optional)</Label>
              <Input
                value={printerForm.serialNumber}
                onChange={(e) => setPrinterForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={printerMutation.isPending}>
                Save printer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload and print</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPrint} className="space-y-4">
            <div className="space-y-2">
              <Label>Printer (identified by IP)</Label>
              <Select value={selectedPrinterIp} onValueChange={setSelectedPrinterIp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a printer" />
                </SelectTrigger>
                <SelectContent>
                  {printerOptions.map((printer) => (
                    <SelectItem value={printer.ipAddress} key={printer.id}>
                      {printer.name} ({printer.type}) - {printer.ipAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>G-code file</Label>
              <Input
                type="file"
                accept=".gcode,.gc,.gco,text/plain"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={uploadMutation.isPending}>
              Upload, hash, store, and print
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
