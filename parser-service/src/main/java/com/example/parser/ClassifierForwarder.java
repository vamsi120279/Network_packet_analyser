package com.example.parser;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

public class ClassifierForwarder {
    private static final RestTemplate rest = new RestTemplate();
    private static final String classifierService = "http://classifier-service:8080/api/classify";
    private static final String classifierLocal = "http://localhost:8083/api/classify";

    public static void forward(Map<String, Object> parsed) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> req = new HttpEntity<>(parsed, headers);
            try {
                rest.postForObject(classifierService, req, String.class);
            } catch (Exception e) {
                rest.postForObject(classifierLocal, req, String.class);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
