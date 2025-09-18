/*
 * Implements a 2-D array of characters
 */

public class CharMatrix
{
    public final char SPACE = ' ';
    private char[][] m;

    /*
     * Constructor: creates a m with dimensions rows, cols,
     * and fills it with spaces
     */
    public CharMatrix(int rows, int cols)
    {
        m = new char[rows][cols];
        fillRect(0, 0, rows-1, cols-1, SPACE);
    }

    /*
     * Constructor: creates a m with dimensions rows , cols ,
     * and fills it with the fill character
     */
    public CharMatrix(int rows, int cols, char fill)
    {
        m = new char[rows][cols];
        fillRect(0, 0, rows-1, cols-1, fill);
    }

    /*
     * Returns the number of rows in m
     */
    public int numRows()
    {
        return m.length;
    }

    /*
     * Returns the number of columns in m
     */
    public int numCols()
    {
        return m[0].length;      
    }

    /*
     * Returns the character at row, col location
     */
    public char charAt(int row, int col)
    {
        return m[row][col];
    }

    /*
     * Sets the character at row, col location to ch
     */
    public void setCharAt(int row, int col, char ch)
    {
        m[row][col] = ch;
    }

    /*
     * Returns true if the character at row, col is a SPACE,
     * false otherwise
     */
    public boolean isEmpty(int row, int col)
    {
        return m[row][col] == SPACE;
    }

    /*
     * Fills the given rectangle with the fill characters.
     * row0, col0 is the upper left corner and row1, col1 is the
     * lower right corner of the rectangle.
     */
    public void fillRect(int row0, int col0, int row1, int col1, char fill)
    {
        for (int r = row0; r < row1; r++) {
            for (int c = col0; c < col1; c++) {
                m[r][c] = fill;
            }
        }
    }

    /*
     * Fills the given rectangle with the SPACE characters.
     * row0, col0 is the upper left corner and row1, col1 is the
     * lower right corner of the rectangle.
     */
    public void clearRect(int row0, int col0, int row1, int col1)
    {
        fillRect(row0, col0, row1, col1, SPACE);
    }

    /*
     * Returns the count of all non-SPACE characters in row.
     */
    public int countInRow(int row)
    {
        int count = 0;
        for (int c = 0; c < m[0].length; c++) {
            if (m[row][c] != SPACE) {
                count++;
            }
        }
        return count;
    }

    /*
     * Returns the count of all non-SPACE characters in col.
     */
    public int countInCol(int col)
    {
        int count = 0;
        for (int r = 0; r < m.length; r++) {
            if (m[r][col] != SPACE) {
                count++;
            }
        }
        return count;
    }

}
