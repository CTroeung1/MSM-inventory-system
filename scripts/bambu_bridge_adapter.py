import json
import os
import shutil
import sys
import time
from pathlib import Path


def fail(message: str, code: int = 1) -> int:
    print(message, file=sys.stderr)
    return code


def main() -> int:
    ip_address = os.getenv("BAMBU_IP_ADDRESS", "").strip()
    serial_number = os.getenv("BAMBU_SERIAL_NUMBER", "").strip()
    access_code = os.getenv("BAMBU_ACCESS_CODE", "").strip()
    file_name = os.getenv("BAMBU_FILE_NAME", "").strip()
    file_path = os.getenv("BAMBU_FILE_PATH", "").strip()

    if not ip_address:
      return fail("Missing BAMBU_IP_ADDRESS")
    if not access_code:
      return fail("Missing BAMBU_ACCESS_CODE")
    if not file_name:
      return fail("Missing BAMBU_FILE_NAME")
    if not file_path:
      return fail("Missing BAMBU_FILE_PATH")

    src = Path(file_path)
    if not src.exists():
        return fail(f"File not found: {src}")

    if src.suffix.lower() != ".3mf":
        return fail("This adapter currently expects a .3mf file")

    mode = os.getenv("BAMBU_ADAPTER_MODE", "stub").strip().lower()

    if mode == "stub":
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "stub",
                    "message": "Python adapter invoked successfully (no printer dispatch yet).",
                    "ipAddress": ip_address,
                    "serialNumber": serial_number or None,
                    "fileName": file_name,
                    "fileSizeBytes": src.stat().st_size,
                }
            )
        )
        return 0

    if mode == "copy":
        out_dir = Path(os.getenv("BAMBU_ADAPTER_COPY_DIR", "uploads/bambu-adapter-outbox"))
        out_dir.mkdir(parents=True, exist_ok=True)
        target = out_dir / src.name
        shutil.copy2(src, target)
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "copy",
                    "message": "Copied file to local outbox (simulated dispatch).",
                    "targetPath": str(target),
                }
            )
        )
        return 0

    if mode == "bambulabs_api":
        try:
            import bambulabs_api as bl  # type: ignore
        except Exception as exc:
            return fail(
                "Failed to import bambulabs_api. Install it with "
                "`pip install bambulabs_api` (Python 3.10+). "
                f"Import error: {exc}"
            )

        plate_number_raw = os.getenv("BAMBU_ADAPTER_PLATE_NUMBER", "1").strip()
        try:
            plate_number: int | str = int(plate_number_raw)
        except ValueError:
            plate_number = plate_number_raw

        use_ams = os.getenv("BAMBU_ADAPTER_USE_AMS", "true").strip().lower() == "true"
        flow_calibration = (
            os.getenv("BAMBU_ADAPTER_FLOW_CALIBRATION", "true").strip().lower()
            == "true"
        )

        ams_mapping_raw = os.getenv("BAMBU_ADAPTER_AMS_MAPPING", "0").strip()
        try:
            ams_mapping = [int(x.strip()) for x in ams_mapping_raw.split(",") if x.strip()]
        except ValueError:
            return fail(
                "Invalid BAMBU_ADAPTER_AMS_MAPPING. Use comma-separated integers, e.g. 0 or 0,1"
            )
        if not ams_mapping:
            ams_mapping = [0]

        printer = None
        upload_result = None
        start_result = None

        try:
            printer = bl.Printer(ip_address, access_code, serial_number)
            printer.connect()

            # Give the printer connection a moment to settle before FTP/MQTT ops.
            time.sleep(float(os.getenv("BAMBU_ADAPTER_CONNECT_SETTLE_SECONDS", "2")))

            with open(src, "rb") as fh:
                upload_result = printer.upload_file(fh, file_name)

            # Some versions return a string/path, examples also check for FTP code "226".
            if upload_result in (None, False):
                return fail("bambulabs_api upload_file returned no success value")

            start_result = printer.start_print(
                file_name,
                plate_number,
                use_ams=use_ams,
                ams_mapping=ams_mapping,
                flow_calibration=flow_calibration,
            )

            if start_result is False:
                return fail("bambulabs_api start_print returned False")

            print(
                json.dumps(
                    {
                        "ok": True,
                        "mode": "bambulabs_api",
                        "message": "Uploaded and start_print command sent via bambulabs_api.",
                        "ipAddress": ip_address,
                        "serialNumber": serial_number or None,
                        "fileName": file_name,
                        "uploadResult": str(upload_result),
                        "startResult": bool(start_result),
                        "plateNumber": plate_number,
                        "useAms": use_ams,
                        "amsMapping": ams_mapping,
                        "flowCalibration": flow_calibration,
                    }
                )
            )
            return 0
        except Exception as exc:
            return fail(f"bambulabs_api dispatch failed: {exc}")
        finally:
            if printer is not None:
                try:
                    printer.disconnect()
                except Exception:
                    pass

    # Real Bambu LAN dispatch integration point.
    # Replace this branch with a library-backed implementation.
    #
    # Example shape (pseudo-code):
    #   from bambulabs_api import Printer
    #   printer = Printer(ip_address, access_code, serial_number=serial_number)
    #   printer.connect()
    #   printer.upload_file(str(src))
    #   printer.start_print(file_name)
    #
    return fail(
        "Unsupported BAMBU_ADAPTER_MODE. Use 'stub', 'copy', or 'bambulabs_api'."
    )


if __name__ == "__main__":
    sys.exit(main())
