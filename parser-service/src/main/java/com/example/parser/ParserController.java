package com.example.parser;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ParserController {

    @Autowired
    private PacketParser parser;

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestBody Map<String, Object> body) {
        // Accept { raw_base64: "..." } or byte[] array (not used)
        if (body.containsKey("raw_base64")) {
            String b64 = (String) body.get("raw_base64");
            Map<String, Object> parsed = parser.parseFromRawBase64(b64);
            // forward to classifier
            try {
                ClassifierForwarder.forward(parsed);
            } catch (Exception e) {
                // ignore errors forwarding
            }
            return ResponseEntity.ok(parsed);
        } else {
            return ResponseEntity.badRequest().body("raw_base64 required");
        }
    }
}
