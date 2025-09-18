package com.example.classifier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ClassifierController {

    @Autowired
    private SimpleClassifier classifier;

    @PostMapping("/classify")
    public ResponseEntity<?> classify(@RequestBody Map<String, Object> pkt) {
        String label = classifier.classify(pkt);
        pkt.put("label", label);

        // persist to db if available (skipped here)
        try {
            StorageForwarder.store(pkt);
        } catch (Exception e) {
            // ignore
        }

        return ResponseEntity.ok(label);
    }
}
