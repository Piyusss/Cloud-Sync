package com.cloudvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class CloudVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(CloudVaultApplication.class, args);
    }
}
