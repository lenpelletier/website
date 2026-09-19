import java.util.Scanner;

public class Temperature {

	public static void main (String[] args) {
		
		Scanner in = new Scanner(System.in);
		
		System.out.print("Enter a temperature in celsius: ");
		double cTemp = in.nextInt();
		double fTemp = cTemp * 9.0 / 5 + 32;
		System.out.println(cTemp + " c = " + fTemp + " F");
		System.out.printf("%.1f c = %.1f F", cTemp, fTemp);
		
	}
}
