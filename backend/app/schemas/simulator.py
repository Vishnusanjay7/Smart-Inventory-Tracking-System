from typing import Optional
from pydantic import BaseModel, Field

class SimulatorScanRequest(BaseModel):
    rfid_uid: str = Field(..., description="Simulated RFID UID (e.g., E234A891 or custom)")
    device_id: str = Field(default="ESP8266-01", description="Target device")
    reader_id: str = Field(default="RC522-01", description="Target reader")
    rack_code: str = Field(default="A1", description="Target rack")
    simulate_offline: Optional[bool] = Field(default=False, description="Simulate device offline behavior")
