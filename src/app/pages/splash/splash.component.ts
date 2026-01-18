import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.scss'
})
export class SplashComponent implements OnInit, AfterViewInit {
  @ViewChild('servicesSection') servicesSection!: ElementRef;
  
  isLoggedIn = false;
  showScrollBtn = false;

  faqItems = [
    { 
      question: "Comment garantissez-vous la qualité des talents ?", 
      answer: "Nous utilisons un processus de sélection rigoureux en plusieurs étapes incluant des évaluations techniques, des entretiens comportementaux et des vérifications de références approfondies.", 
      open: false 
    },
    { 
      question: "Quels sont vos délais moyens de recrutement ?", 
      answer: "Grâce à notre réseau étendu et notre base de données de candidats qualifiés, nous pouvons présenter les premiers profils en 48-72 heures pour les postes standards.", 
      open: false 
    },
    { 
      question: "Votre plateforme est-elle compatible avec nos systèmes existants ?", 
      answer: "Oui, notre plateforme propose des API modernes et s'intègre facilement avec la majorité des systèmes RH, ERP et logiciels de paie du marché.", 
      open: false 
    },
    { 
      question: "Proposez-vous un accompagnement personnalisé ?", 
      answer: "Absolument. Chaque client bénéficie d'un consultant RH dédié qui l'accompagne tout au long de son parcours et répond à ses besoins spécifiques.", 
      open: false 
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    // Vérifier si l'utilisateur est connecté
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  ngAfterViewInit() {
    // Initialiser les animations de révélation au scroll
    this.initScrollReveal();
  }

  // ===== GESTION FAQ =====
  toggleFaq(index: number) {
    this.faqItems[index].open = !this.faqItems[index].open;
  }

  // ===== EFFET PARALLAXE SOURIS =====
  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    const bgText = this.el.nativeElement.querySelector('.hero-bg-text');
    if (bgText) {
      const x = (window.innerWidth - e.pageX * 2) / 150;
      const y = (window.innerHeight - e.pageY * 2) / 150;
      this.renderer.setStyle(bgText, 'transform', `translate(${x}px, ${y}px)`);
    }
  }

  // ===== GESTION DU SCROLL =====
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPos = window.pageYOffset;
    
    // Afficher/masquer le bouton de retour en haut
    this.showScrollBtn = scrollPos > 400;

    // Effet parallaxe sur le titre au scroll
    const heroTitle = this.el.nativeElement.querySelector('.main-title');
    if (heroTitle && scrollPos < 800) {
      this.renderer.setStyle(heroTitle, 'transform', `translateY(${scrollPos * 0.2}px)`);
      this.renderer.setStyle(heroTitle, 'opacity', `${1 - scrollPos / 1000}`);
    }
  }

  // Retour en haut de page
  scrollToTop() {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }

  // Scroll vers la section services
  scrollToServices() {
    if (this.servicesSection) {
      this.servicesSection.nativeElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // ===== ANIMATIONS D'APPARITION AU SCROLL =====
  private initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'active');
          // Optionnel : arrêter d'observer après activation
          // observer.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -80px 0px'
    });

    // Observer tous les éléments avec la classe 'reveal'
    const reveals = this.el.nativeElement.querySelectorAll('.reveal');
    reveals.forEach((el: HTMLElement) => observer.observe(el));
  }

  // ===== NAVIGATION =====
  navigateToLogin() {
    if (this.isLoggedIn) {
      this.router.navigate(['/app/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  navigateToDashboard() {
    this.router.navigate(['/app/dashboard']);
  }
}