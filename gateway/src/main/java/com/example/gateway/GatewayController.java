package com.example.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.sql.Timestamp;
import java.util.*;

@RestController
@RequestMapping("/api")
public class GatewayController {

    @Autowired
    private JdbcTemplate jdbc;

    // health
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Collections.singletonMap("status", "ok"));
    }

    // store parsed+classified record
    @PostMapping("/store")
    public ResponseEntity<?> store(@RequestBody Map<String,Object> record) {
        try {
            String src_ip = (String) record.getOrDefault("src_ip", record.getOrDefault("src", null));
            String dst_ip = (String) record.getOrDefault("dst_ip", record.getOrDefault("dst", null));
            Integer src_port = record.get("src_port") instanceof Number ? ((Number) record.get("src_port")).intValue() : null;
            Integer dst_port = record.get("dst_port") instanceof Number ? ((Number) record.get("dst_port")).intValue() : null;
            String protocol = (String) record.getOrDefault("protocol", null);
            Integer length = record.get("length") instanceof Number ? ((Number) record.get("length")).intValue() : null;
            String label = (String) record.getOrDefault("label", null);
            Timestamp ts = new Timestamp(System.currentTimeMillis());

            jdbc.update("INSERT INTO packets (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, length, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ts, src_ip, dst_ip, src_port, dst_port, protocol, length, label);
            return ResponseEntity.ok("stored");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    // search packets
    @GetMapping("/packets")
    public ResponseEntity<?> packets(@RequestParam Map<String,String> qp) {
        try {
            int page = Integer.parseInt(qp.getOrDefault("page","1"));
            int pageSize = Integer.parseInt(qp.getOrDefault("page_size","25"));
            String protocol = qp.get("protocol");
            String src_ip = qp.get("src_ip");
            String dst_ip = qp.get("dst_ip");
            boolean suspicious_only = Boolean.parseBoolean(qp.getOrDefault("suspicious_only","false"));
            boolean malicious_only = Boolean.parseBoolean(qp.getOrDefault("malicious_only","false"));

            StringBuilder sb = new StringBuilder("SELECT id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, length, label FROM packets WHERE 1=1");
            List<Object> params = new ArrayList<>();
            if (protocol != null && !protocol.isEmpty()) { sb.append(" AND protocol = ?"); params.add(protocol); }
            if (src_ip != null && !src_ip.isEmpty()) { sb.append(" AND src_ip = ?"); params.add(src_ip); }
            if (dst_ip != null && !dst_ip.isEmpty()) { sb.append(" AND dst_ip = ?"); params.add(dst_ip); }
            if (suspicious_only) { sb.append(" AND label ILIKE ?"); params.add("%suspicious%"); }
            if (malicious_only) { sb.append(" AND label ILIKE ?"); params.add("%malicious%"); }
            sb.append(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");
            params.add(pageSize);
            params.add((page-1)*pageSize);

            List<Map<String,Object>> rows = jdbc.queryForList(sb.toString(), params.toArray());
            Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM packets", Integer.class);
            Map<String,Object> res = new HashMap<>();
            res.put("packets", rows);
            res.put("total", total);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> statistics() {
        try {
            Map<String,Object> stats = new HashMap<>();
            Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM packets", Integer.class);
            Integer suspicious = jdbc.queryForObject("SELECT COUNT(*) FROM packets WHERE label ILIKE '%suspicious%'", Integer.class);
            Integer malicious = jdbc.queryForObject("SELECT COUNT(*) FROM packets WHERE label ILIKE '%malicious%'", Integer.class);
            stats.put("basic_statistics", Collections.singletonMap("packets_analyzed", total));
            Map<String,Integer> security = new HashMap<>();
            security.put("suspicious_detected", suspicious);
            security.put("malicious_detected", malicious);
            stats.put("security_statistics", security);

            List<Map<String,Object>> protocols = jdbc.queryForList("SELECT protocol, COUNT(*) as c FROM packets GROUP BY protocol");
            Map<String,Integer> protocolDistribution = new LinkedHashMap<>();
            for (Map<String,Object> r: protocols) {
                protocolDistribution.put(String.valueOf(r.get("protocol")), ((Number)r.get("c")).intValue());
            }
            stats.put("protocol_distribution", protocolDistribution);

            Map<String,Object> netOverview = new HashMap<>();
            Integer srcUnique = jdbc.queryForObject("SELECT COUNT(DISTINCT src_ip) FROM packets", Integer.class);
            Integer dstUnique = jdbc.queryForObject("SELECT COUNT(DISTINCT dst_ip) FROM packets", Integer.class);
            netOverview.put("unique_source_ips", srcUnique);
            netOverview.put("unique_destination_ips", dstUnique);
            stats.put("network_overview", netOverview);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> alerts() {
        try {
            List<Map<String,Object>> rows = jdbc.queryForList("SELECT id, timestamp, src_ip, dst_ip, label FROM packets WHERE label IS NOT NULL AND (label ILIKE '%malicious%' OR label ILIKE '%suspicious%') ORDER BY timestamp DESC LIMIT 100");
            List<Map<String,Object>> alerts = new ArrayList<>();
            for (Map<String,Object> r: rows) {
                Map<String,Object> a = new HashMap<>();
                a.put("id", r.get("id"));
                a.put("timestamp", r.get("timestamp"));
                a.put("type", r.get("label"));
                a.put("description", r.get("label"));
                a.put("source_ip", r.get("src_ip"));
                a.put("destination_ip", r.get("dst_ip"));
                String lab = String.valueOf(r.get("label") == null ? "" : r.get("label"));
                a.put("severity", lab.toLowerCase().contains("malicious") ? "high" : "medium");
                alerts.add(a);
            }
            return ResponseEntity.ok(Collections.singletonMap("alerts", alerts));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/export")
    public ResponseEntity<?> export(@RequestBody Map<String,Object> req) {
        try {
            String format = String.valueOf(req.getOrDefault("format", "json"));
            // for simplicity export all rows as json string
            List<Map<String,Object>> rows = jdbc.queryForList("SELECT * FROM packets ORDER BY timestamp DESC");
            if ("csv".equalsIgnoreCase(format)) {
                StringBuilder sb = new StringBuilder();
                sb.append("id,timestamp,src_ip,dst_ip,src_port,dst_port,protocol,length,label\n");
                for (Map<String,Object> r: rows) {
                    sb.append(r.get("id")).append(",")
                      .append(r.get("timestamp")).append(",")
                      .append(r.get("src_ip")).append(",")
                      .append(r.get("dst_ip")).append(",")
                      .append(r.get("src_port")).append(",")
                      .append(r.get("dst_port")).append(",")
                      .append(r.get("protocol")).append(",")
                      .append(r.get("length")).append(",")
                      .append(r.get("label")).append("\n");
                }
                return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=packets.csv").body(sb.toString());
            } else {
                return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=packets.json").body(rows);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/clear")
    public ResponseEntity<?> clear() {
        try {
            jdbc.update("DELETE FROM packets");
            return ResponseEntity.ok("cleared");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
