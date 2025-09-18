package com.example.capture;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api")
public class CaptureController {

    @Autowired
    private PacketSniffer sniffer;

    @Autowired
    private ForwardService forwardService;

    private final AtomicInteger packetsCaptured = new AtomicInteger(0);

    @GetMapping("/capture/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(new Status(sniffer != null, packetsCaptured.get(), 0));
    }

    @PostMapping("/capture/start")
    public ResponseEntity<?> start(@RequestBody CaptureParams params) {
        try {
            String iface = params.getInterface() == null ? params.getIface() : params.getInterface();
            if (iface == null || iface.isEmpty()) {
                return ResponseEntity.badRequest().body("interface required");
            }
            sniffer.startLiveCapture(iface, raw -> {
                packetsCaptured.incrementAndGet();
                // forward raw bytes to parser service
                forwardService.forwardRawPacket(raw);
            });
            return ResponseEntity.ok("started");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/capture/stop")
    public ResponseEntity<?> stop() {
        try {
            sniffer.stop();
            return ResponseEntity.ok("stopped");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping(value = "/pcap/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadPcap(@RequestParam("file") MultipartFile file) {
        try {
            File tmp = File.createTempFile("upload-", ".pcap");
            file.transferTo(tmp);
            // parse file and forward packets
            forwardService.forwardPcapFile(tmp.getAbsolutePath());
            tmp.delete();
            return ResponseEntity.ok("processed");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    static class Status {
        public boolean is_capturing;
        public int packets_captured;
        public int packets_analyzed;
        public Status(boolean c, int cap, int anal) {
            this.is_capturing = c;
            this.packets_captured = cap;
            this.packets_analyzed = anal;
        }
    }
}
