package com.example.classifier;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

public class StorageForwarder {
    private static final RestTemplate rest = new RestTemplate();
    private static final String gatewayStore = "http://gateway:8080/api/store"; // when docker
    private static final String gatewayLocal = "http://localhost:8080/api/store";

    public static void store(Map<String, Object> record) {
        try {
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String,Object>> req = new HttpEntity<>(record, h);
            try {
                rest.postForObject(gatewayStore, req, String.class);
            } catch (Exception e) {
                rest.postForObject(gatewayLocal, req, String.class);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
