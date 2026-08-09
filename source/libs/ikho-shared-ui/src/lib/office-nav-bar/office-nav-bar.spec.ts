import { TestBed } from '@angular/core/testing';
import { OfficeNavBar } from './office-nav-bar';

describe('OfficeNavBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeNavBar],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the signed-in user when provided', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jane Doe');
  });
});
