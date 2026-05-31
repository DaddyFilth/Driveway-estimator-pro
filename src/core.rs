use serde::{Deserialize, Serialize};

fn session_cookie() -> String {
    std::env::var("SESSION_COOKIE").unwrap_or_default()
}

fn client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .default_headers({
            let mut h = reqwest::header::HeaderMap::new();
            let cookie = session_cookie();
            if !cookie.is_empty() {
                h.insert(reqwest::header::COOKIE, cookie.parse().unwrap());
            }
            h
        })
        .build()
        .unwrap()
}

#[derive(Deserialize, Debug, Clone)]
pub struct Corner {
    pub x: f64,
    pub y: f64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct EdgeDetectionResult {
    pub corners: Vec<Corner>,
    pub confidence: f64,
    pub description: String,
    pub square_feet: u32,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PricingResult {
    pub price_per_ton: f64,
    pub quantity_needed: String,
    pub total_cost: String,
    pub supplier: String,
}

pub fn detect_edges(_photo_url: &str, image_width: u32, image_height: u32) -> Result<EdgeDetectionResult, String> {
    let url = "http://localhost:3000/api/trpc/projects.uploadPhotoAndDetectEdges";
    let body = serde_json::json!({
        "json": {
            "photoBase64": "",
            "photoName": "photo.jpg",
            "imageWidth": image_width,
            "imageHeight": image_height
        }
    });
    let resp = client().post(url).json(&body).send().map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    let data = &json["result"]["data"]["json"];
    if data.is_null() {
        return Err(json["error"]["message"].as_str().unwrap_or("tRPC error").to_string());
    }
    Ok(EdgeDetectionResult {
        corners: serde_json::from_value(data["corners"].clone()).map_err(|e| e.to_string())?,
        confidence: data["confidence"].as_f64().unwrap_or(0.0),
        description: data["description"].as_str().unwrap_or("").to_string(),
        square_feet: data["squareFeet"].as_u64().unwrap_or(0) as u32,
    })
}

pub fn get_pricing(zip_code: &str, material: &str, square_feet: f64, depth_inches: f64) -> Result<PricingResult, String> {
    let input = urlencoding::encode(&serde_json::json!({
        "json": { "zipCode": zip_code, "material": material, "squareFeet": square_feet, "depthInches": depth_inches }
    }).to_string()).to_string();
    let url = format!("http://localhost:3000/api/trpc/projects.getPricing?input={}", input);
    let resp = client().get(&url).send().map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    let data = &json["result"]["data"]["json"];
    if data.is_null() {
        return Err(json["error"]["message"].as_str().unwrap_or("tRPC error").to_string());
    }
    Ok(PricingResult {
        price_per_ton: data["pricePerTon"].as_f64().unwrap_or(0.0),
        quantity_needed: data["quantityNeeded"].as_str().unwrap_or("").to_string(),
        total_cost: data["totalCost"].as_str().unwrap_or("$0").to_string(),
        supplier: data["supplier"].as_str().unwrap_or("").to_string(),
    })
}
