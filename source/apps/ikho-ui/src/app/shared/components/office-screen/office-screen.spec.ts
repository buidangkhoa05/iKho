import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeScreen } from './office-screen';

describe('OfficeScreen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeScreen],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('emits primaryAction when the primary button is clicked', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('primaryActionLabel', 'Create purchase order');
    fixture.detectChanges();

    let callCount = 0;
    fixture.componentInstance.primaryAction.subscribe(() => callCount++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();

    expect(callCount).toBe(1);
  });
});
