"""
SafetyDetector - Détection YOLOv8 + Analyse de risques
Copié du notebook SafetyVision_YOLOv8_v5_FINAL.ipynb (cellule 7)
"""
import io
import base64
from typing import Dict, Any, List, Tuple
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

from .config import CLASS_NAMES, CONF_THRESHOLD, IOU_THRESHOLD, MODEL_PATH
from .risk_analyzer import SafetyRiskAnalyzer


class SafetyDetector:
    """
    Détecteur de sécurité sur chantier avec YOLOv8
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialise le détecteur
        
        Args:
            model_path: Chemin vers le modèle YOLOv8 (best.pt)
        """
        if YOLO is None:
            raise ImportError(
                "ultralytics n'est pas installé. "
                "Installez avec: pip install ultralytics"
            )
        
        self.model_path = model_path or str(MODEL_PATH)
        
        if not Path(self.model_path).exists():
            raise FileNotFoundError(
                f"Modèle YOLOv8 introuvable: {self.model_path}\n"
                f"Placez votre fichier best.pt dans safetyvision/backend/model/"
            )
        
        print(f"🔄 Chargement du modèle YOLOv8: {self.model_path}")
        self.model = YOLO(self.model_path)
        print(f"✅ Modèle chargé avec succès")
        
        self.class_names = CLASS_NAMES
        self.conf_threshold = CONF_THRESHOLD
        self.iou_threshold = IOU_THRESHOLD
        self.analyzer = SafetyRiskAnalyzer()
        
        # Couleurs pour chaque classe
        self.colors = {
            'Hardhat': (0, 255, 0),           # Vert
            'Mask': (0, 255, 255),            # Cyan
            'NO-Hardhat': (255, 0, 0),        # Rouge
            'NO-Mask': (255, 100, 0),         # Orange
            'NO-Safety Vest': (255, 0, 100),  # Rose
            'Person': (255, 255, 0),          # Jaune
            'Safety Cone': (0, 200, 255),     # Bleu clair
            'Safety Vest': (0, 255, 150),     # Vert clair
            'machinery': (150, 0, 255),       # Violet
            'vehicle': (200, 0, 200)          # Magenta
        }
    
    def _run_yolo(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Exécute YOLOv8 sur l'image
        
        Args:
            image: Image numpy array (BGR)
        
        Returns:
            Liste de détections
        """
        results = self.model.predict(
            image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            imgsz=416,
            verbose=False
        )
        
        detections = []
        
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            
            for i in range(len(boxes)):
                box = boxes.xyxy[i].cpu().numpy()
                conf = float(boxes.conf[i].cpu().numpy())
                cls = int(boxes.cls[i].cpu().numpy())
                
                if cls < len(self.class_names):
                    detections.append({
                        'class_name': self.class_names[cls],
                        'confidence': conf,
                        'bbox': {
                            'x1': float(box[0]),
                            'y1': float(box[1]),
                            'x2': float(box[2]),
                            'y2': float(box[3])
                        }
                    })
        
        return detections
    
    def _draw_annotations(self, image: np.ndarray, detections: List[Dict[str, Any]],
                         analysis: Dict[str, Any]) -> np.ndarray:
        """
        Dessine les annotations sur l'image
        
        Args:
            image: Image numpy array (BGR)
            detections: Liste des détections
            analysis: Résultat de l'analyse de risques
        
        Returns:
            Image annotée (BGR)
        """
        annotated = image.copy()
        height, width = annotated.shape[:2]
        
        # Dessiner les bounding boxes
        for det in detections:
            bbox = det['bbox']
            class_name = det['class_name']
            conf = det['confidence']
            
            x1, y1 = int(bbox['x1']), int(bbox['y1'])
            x2, y2 = int(bbox['x2']), int(bbox['y2'])
            
            color = self.colors.get(class_name, (255, 255, 255))
            
            # Rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Label
            label = f"{class_name} {conf:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            
            # Background du label
            cv2.rectangle(
                annotated,
                (x1, y1 - label_size[1] - 10),
                (x1 + label_size[0], y1),
                color,
                -1
            )
            
            # Texte
            cv2.putText(
                annotated,
                label,
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 0),
                1
            )
        
        # Ajouter le badge de risque en haut à gauche
        risk_config = analysis['risk_config']
        risk_text = f"{risk_config['emoji']} {risk_config['label']} - Score: {analysis['risk_score']}"
        
        # Convertir couleur hex en BGR
        hex_color = risk_config['color'].lstrip('#')
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        badge_color = (b, g, r)  # BGR
        
        # Rectangle du badge
        badge_height = 50
        cv2.rectangle(annotated, (0, 0), (width, badge_height), badge_color, -1)
        
        # Texte du badge
        cv2.putText(
            annotated,
            risk_text,
            (10, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 255),
            2
        )
        
        return annotated
    
    def _generate_report(self, analysis: Dict[str, Any], detections: List[Dict[str, Any]]) -> str:
        """
        Génère un rapport markdown
        
        Args:
            analysis: Résultat de l'analyse
            detections: Liste des détections
        
        Returns:
            Rapport en markdown
        """
        risk_config = analysis['risk_config']
        stats = analysis['stats']
        violations = analysis['violations']
        
        report = f"""# 🏗️ Rapport d'Analyse de Sécurité

## {risk_config['emoji']} Niveau de Risque: {risk_config['label']}

**Score de risque:** {analysis['risk_score']}/10

---

## 📊 Statistiques

- **Personnes détectées:** {stats['total_persons']}
- **Avec casque:** {stats['workers_with_hardhat']} ✅
- **Sans casque:** {stats['workers_without_hardhat']} ❌
- **Avec gilet:** {stats['workers_with_vest']} ✅
- **Sans gilet:** {stats['workers_without_vest']} ❌
- **Engins dangereux:** {stats['dangerous_objects']} 🚧
- **Cônes de sécurité:** {stats['safety_cones']} 🚦
- **Taux de conformité:** {stats['compliance_rate']:.1f}%

---

## ⚠️ Violations Détectées ({len(violations)})

"""
        
        if violations:
            for i, violation in enumerate(violations, 1):
                severity_emoji = '🔴' if violation['severity'] >= 2 else '⚠️'
                report += f"{i}. {severity_emoji} **{violation['type']}** - {violation['message']}\n"
        else:
            report += "✅ Aucune violation détectée. Excellent travail!\n"
        
        report += f"""
---

## 🔍 Détections Totales: {len(detections)}

"""
        
        # Compter les détections par classe
        class_counts = {}
        for det in detections:
            class_name = det['class_name']
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        for class_name, count in sorted(class_counts.items(), key=lambda x: x[1], reverse=True):
            report += f"- **{class_name}:** {count}\n"
        
        return report
    
    def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyse une image et retourne les résultats complets
        
        Args:
            image_bytes: Bytes de l'image (JPEG, PNG, etc.)
        
        Returns:
            {
                'detections': List[Dict],
                'analysis': Dict,
                'report': str,
                'annotated_image': str (base64)
            }
        """
        # Charger l'image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Redimensionner si trop grande pour accélérer la prédiction
        max_size = 640
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), Image.LANCZOS)
        
        image_np = np.array(image)
        
        # Convertir RGB -> BGR pour OpenCV
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        else:
            image_bgr = image_np
        
        # Détection YOLOv8
        detections = self._run_yolo(image_bgr)
        
        # Analyse de risques
        analysis = self.analyzer.analyze(detections)
        
        # Générer le rapport
        report = self._generate_report(analysis, detections)
        
        # Annoter l'image
        annotated_bgr = self._draw_annotations(image_bgr, detections, analysis)
        
        # Convertir BGR -> RGB pour PIL
        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
        annotated_pil = Image.fromarray(annotated_rgb)
        
        # Convertir en base64
        buffer = io.BytesIO()
        annotated_pil.save(buffer, format='JPEG', quality=75)
        annotated_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            'detections': detections,
            'analysis': analysis,
            'report': report,
            'annotated_image': annotated_base64
        }
