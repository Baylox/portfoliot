import {
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  OnDestroy,
  OnInit,
} from '@angular/core';

/**
 * Révèle l'élément (fondu + translation) lorsqu'il entre dans le viewport.
 * Le délai optionnel permet de décaler les éléments d'une même grille.
 *
 *   <div appReveal></div>
 *   <div appReveal="150"></div>
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective implements OnInit, OnDestroy {
  readonly appReveal = input(0, { transform: numberAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const element = this.host.nativeElement;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    element.classList.add('reveal');
    element.style.transitionDelay = `${this.appReveal()}ms`;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('reveal--visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
