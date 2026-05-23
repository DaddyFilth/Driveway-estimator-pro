use eframe::egui;
use std::sync::mpsc;
use crate::core::{EdgeDetectionResult, PricingResult};

#[derive(Clone, Copy, PartialEq, Eq)]
enum View { Dashboard, DetectEdges, GetPricing, History, Settings }

#[derive(Clone)]
enum JobResult {
    Edges(EdgeDetectionResult),
    Pricing(PricingResult),
    Error(String),
}

#[derive(Clone)]
enum JobStatus { Idle, Running, Done(JobResult) }

pub struct EasyAsphaltApp {
    current_view: View,
    // Detect Edges inputs
    photo_url: String,
    image_width: String,
    image_height: String,
    // Pricing inputs
    zip_code: String,
    material: usize,
    square_feet: String,
    depth_inches: String,
    // State
    status: JobStatus,
    history: Vec<JobResult>,
    rx: Option<mpsc::Receiver<JobStatus>>,
    server_url: String,
}

const MATERIALS: &[&str] = &["hotmix", "millings", "tar_and_chip", "gravel"];

impl EasyAsphaltApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Self {
            current_view: View::Dashboard,
            photo_url: String::new(),
            image_width: "1920".to_string(),
            image_height: "1080".to_string(),
            zip_code: String::new(),
            material: 0,
            square_feet: String::new(),
            depth_inches: "3".to_string(),
            status: JobStatus::Idle,
            history: Vec::new(),
            rx: None,
            server_url: "http://localhost:3000".to_string(),
        }
    }

    fn is_running(&self) -> bool { matches!(self.status, JobStatus::Running) }

    fn poll_job(&mut self, ctx: &egui::Context) {
        if matches!(self.status, JobStatus::Running) { ctx.request_repaint(); }
        if let Some(rx) = &self.rx {
            if let Ok(msg) = rx.try_recv() {
                if let JobStatus::Done(ref r) = msg { self.history.push(r.clone()); }
                self.status = msg;
                self.rx = None;
                ctx.request_repaint();
            }
        }
    }

    fn spawn<F: FnOnce() -> JobResult + Send + 'static>(&mut self, f: F) {
        let (tx, rx) = mpsc::channel();
        self.status = JobStatus::Running;
        self.rx = Some(rx);
        std::thread::spawn(move || { let _ = tx.send(JobStatus::Done(f())); });
    }

    fn render_status(&self, ui: &mut egui::Ui) {
        match &self.status {
            JobStatus::Idle => { ui.label("Ready."); }
            JobStatus::Running => { ui.horizontal(|ui| { ui.add(egui::Spinner::new()); ui.label("Calling OpenAI..."); }); }
            JobStatus::Done(JobResult::Error(e)) => { ui.colored_label(egui::Color32::RED, e); }
            JobStatus::Done(JobResult::Edges(r)) => {
                ui.colored_label(egui::Color32::GREEN, format!("✔ {}ft² | confidence: {:.0}%", r.square_feet, r.confidence * 100.0));
                ui.label(&r.description);
            }
            JobStatus::Done(JobResult::Pricing(r)) => {
                ui.colored_label(egui::Color32::GREEN, format!("✔ Total: {} | {} | Supplier: {}", r.total_cost, r.quantity_needed, r.supplier));
            }
        }
    }

    fn render_sidebar(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("sidebar").resizable(false).default_width(180.0).show(ctx, |ui| {
            ui.heading("Easy-Asphalt");
            ui.small("AI Estimator");
            ui.separator();
            for (view, label) in [
                (View::Dashboard, "🏠 Dashboard"),
                (View::DetectEdges, "🔍 Detect Edges"),
                (View::GetPricing, "💰 Get Pricing"),
                (View::History, "📋 History"),
                (View::Settings, "⚙ Settings"),
            ] {
                if ui.selectable_label(self.current_view == view, label).clicked() {
                    self.current_view = view;
                }
            }
            ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                ui.separator();
                match &self.status {
                    JobStatus::Idle => { ui.label("● Idle"); }
                    JobStatus::Running => { ui.colored_label(egui::Color32::YELLOW, "● Running"); ui.add(egui::Spinner::new()); }
                    JobStatus::Done(JobResult::Error(_)) => { ui.colored_label(egui::Color32::RED, "● Error"); }
                    JobStatus::Done(_) => { ui.colored_label(egui::Color32::GREEN, "● Done"); }
                }
            });
        });
    }

    fn render_dashboard(&mut self, ui: &mut egui::Ui) {
        ui.heading("Dashboard");
        ui.label("AI-powered asphalt estimation using OpenAI vision + pricing APIs.");
        ui.add_space(8.0);
        ui.horizontal_wrapped(|ui| {
            if ui.button("🔍 Detect Edges").clicked() { self.current_view = View::DetectEdges; }
            if ui.button("💰 Get Pricing").clicked() { self.current_view = View::GetPricing; }
            if ui.button("📋 History").clicked() { self.current_view = View::History; }
        });
        ui.separator();
        ui.label(format!("Jobs completed: {}", self.history.len()));
        self.render_status(ui);
    }

    fn render_detect_edges(&mut self, ui: &mut egui::Ui) {
        ui.heading("🔍 Detect Driveway Edges");
        ui.label("OpenAI Vision analyzes your photo and returns corner points + square footage.");
        ui.separator();
        ui.label("Photo URL:"); ui.text_edit_singleline(&mut self.photo_url);
        ui.horizontal(|ui| {
            ui.label("Width px:"); ui.add(egui::TextEdit::singleline(&mut self.image_width).desired_width(80.0));
            ui.label("Height px:"); ui.add(egui::TextEdit::singleline(&mut self.image_height).desired_width(80.0));
        });
        ui.add_space(8.0);
        if ui.add_enabled(!self.is_running(), egui::Button::new("▶ Run Edge Detection")).clicked() {
            let url = self.photo_url.clone();
            let w: u32 = self.image_width.parse().unwrap_or(1920);
            let h: u32 = self.image_height.parse().unwrap_or(1080);
            self.spawn(move || {
                match crate::core::detect_edges(&url, w, h) {
                    Ok(r) => JobResult::Edges(r),
                    Err(e) => JobResult::Error(e),
                }
            });
        }
        ui.add_space(8.0);
        self.render_status(ui);
    }

    fn render_get_pricing(&mut self, ui: &mut egui::Ui) {
        ui.heading("💰 Get Material Pricing");
        ui.label("Fetches real pricing via OpenAI for your zip code and material.");
        ui.separator();
        ui.label("Zip Code:"); ui.text_edit_singleline(&mut self.zip_code);
        ui.label("Material:");
        egui::ComboBox::from_id_salt("material").selected_text(MATERIALS[self.material]).show_ui(ui, |ui| {
            for (i, m) in MATERIALS.iter().enumerate() {
                ui.selectable_value(&mut self.material, i, *m);
            }
        });
        ui.horizontal(|ui| {
            ui.label("Sq ft:"); ui.add(egui::TextEdit::singleline(&mut self.square_feet).desired_width(100.0));
            ui.label("Depth (in):"); ui.add(egui::TextEdit::singleline(&mut self.depth_inches).desired_width(60.0));
        });
        ui.add_space(8.0);
        if ui.add_enabled(!self.is_running(), egui::Button::new("▶ Get Pricing")).clicked() {
            let zip = self.zip_code.clone();
            let mat = MATERIALS[self.material].to_string();
            let sqft: f64 = self.square_feet.parse().unwrap_or(0.0);
            let depth: f64 = self.depth_inches.parse().unwrap_or(3.0);
            self.spawn(move || {
                match crate::core::get_pricing(&zip, &mat, sqft, depth) {
                    Ok(r) => JobResult::Pricing(r),
                    Err(e) => JobResult::Error(e),
                }
            });
        }
        ui.add_space(8.0);
        self.render_status(ui);
    }

    fn render_history(&mut self, ui: &mut egui::Ui) {
        ui.heading("📋 History");
        ui.label(format!("{} completed job(s).", self.history.len()));
        ui.separator();
        if self.history.is_empty() {
            ui.label("No completed jobs yet.");
        } else {
            egui::ScrollArea::vertical().show(ui, |ui| {
                for (i, entry) in self.history.iter().enumerate().rev() {
                    match entry {
                        JobResult::Edges(r) => { ui.monospace(format!("[{}] Edges: {}ft² conf={:.0}%", i+1, r.square_feet, r.confidence*100.0)); }
                        JobResult::Pricing(r) => { ui.monospace(format!("[{}] Pricing: {} {}", i+1, r.total_cost, r.quantity_needed)); }
                        JobResult::Error(e) => { ui.colored_label(egui::Color32::RED, format!("[{}] Error: {}", i+1, e)); }
                    }
                }
            });
            if ui.button("Clear History").clicked() { self.history.clear(); }
        }
    }

    fn render_settings(&mut self, ui: &mut egui::Ui) {
        ui.heading("⚙ Settings");
        ui.separator();
        ui.label("tRPC Server URL:");
        ui.text_edit_singleline(&mut self.server_url);
        ui.small("Default: http://localhost:3000");
    }
}

impl eframe::App for EasyAsphaltApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_job(ctx);
        self.render_sidebar(ctx);
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.current_view {
                View::Dashboard => self.render_dashboard(ui),
                View::DetectEdges => self.render_detect_edges(ui),
                View::GetPricing => self.render_get_pricing(ui),
                View::History => self.render_history(ui),
                View::Settings => self.render_settings(ui),
            }
        });
    }
}
