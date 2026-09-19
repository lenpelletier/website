import java.util.Scanner;

public class ConvertTime {
	
	public static void main (String[] args) {
		
		//CONSTANTS
		final double SECONDS_IN_HOUR = 3600;
		final double SECONDS_IN_MINUTE = 60;
		
		//READ INPUT
		Scanner in = new Scanner(System.in);
		System.out.print("Enter an amount of seconds: ");
		int originalSeconds = in.nextInt();
		
		//TIME CALCULATE
		int seconds = originalSeconds;
		int hours   = seconds / SECONDS_IN_HOUR;   //How many hours are there?
		seconds     = seconds % SECONDS_IN_HOUR;   //How many seconds are left over?
		int minutes = seconds / SECONDS_IN_MINUTE; //How many minutes are there?
		seconds     = seconds % SECONDS_IN_MINUTE; //How many seconds are left over after that?
	
		//OUTPUT
		System.out.println(originalSeconds + " seconds = " + hours + " hours, " + minutes + " minutes, and " + seconds + " seconds.");
		System.out.printf("%d seconds = %d hours, %d minutes, and %d seconds.", originalSeconds, hours, minutes, seconds);                   
	}
}
